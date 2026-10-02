package main

import (
	"context"
	"database/sql"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"api/internal/database"
)

func TestRunRequiresDatabaseURL(t *testing.T) {
	err := run(context.Background(), "127.0.0.1:0", "")
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL is required") {
		t.Fatalf("expected missing configuration error, got %v", err)
	}
}

func TestRunClosesDatabaseOnShutdown(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_URL to a disposable PostgreSQL database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	client, err := database.Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	if err := client.Schema.Create(ctx); err != nil {
		client.Close()
		t.Fatal(err)
	}
	if err := client.Close(); err != nil {
		t.Fatal(err)
	}
	observer, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer observer.Close()
	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	q.Set("application_name", "claim-fusen-shutdown-test")
	u.RawQuery = q.Encode()
	appCtx, stop := context.WithCancel(ctx)
	defer stop()
	done := make(chan error, 1)
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := listener.Addr().String()
	if err := listener.Close(); err != nil {
		t.Fatal(err)
	}
	go func() { done <- run(appCtx, addr, u.String()) }()

	ticker := time.NewTicker(20 * time.Millisecond)
	defer ticker.Stop()
	httpClient := &http.Client{Timeout: time.Second}
	for {
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://"+addr+"/health", nil)
		if err != nil {
			t.Fatal(err)
		}
		if response, err := httpClient.Do(request); err == nil {
			response.Body.Close()
			if response.StatusCode == http.StatusOK {
				break
			}
		}
		select {
		case err := <-done:
			t.Fatalf("backend exited before establishing a connection: %v", err)
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		case <-ticker.C:
		}
	}
	var connections int
	if err := observer.QueryRowContext(ctx, "SELECT count(*) FROM pg_stat_activity WHERE application_name = $1", "claim-fusen-shutdown-test").Scan(&connections); err != nil || connections == 0 {
		t.Fatalf("backend has no active PostgreSQL connection: count=%d err=%v", connections, err)
	}
	stop()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-ctx.Done():
		t.Fatal("backend did not stop")
	}
	// PostgreSQLで切断が反映されるまで待ち、接続が残っていないことを確認する。
	for {
		var connections int
		if err := observer.QueryRowContext(ctx, "SELECT count(*) FROM pg_stat_activity WHERE application_name = $1", "claim-fusen-shutdown-test").Scan(&connections); err != nil {
			t.Fatal(err)
		}
		if connections == 0 {
			break
		}
		select {
		case <-ctx.Done():
			t.Fatal("Ent client connection remained open after shutdown")
		case <-ticker.C:
		}
	}
}
