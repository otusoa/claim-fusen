package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"api/api"
	"api/internal/database"
	"api/internal/service"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := run(ctx, ":"+port, os.Getenv("DATABASE_URL")); err != nil {
		log.Printf("backend stopped: %v", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, addr, databaseURL string) (err error) {
	startupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	client, err := database.Open(startupCtx, databaseURL)
	if err != nil {
		return fmt.Errorf("initialize database: %w", err)
	}
	defer func() {
		if closeErr := client.Close(); closeErr != nil {
			err = errors.Join(err, fmt.Errorf("close Ent client: %w", closeErr))
		}
	}()
	projects := service.NewProjectService(client)
	rows, err := projects.List(startupCtx)
	if err != nil {
		return fmt.Errorf("startup database check: %w", err)
	}
	cancel()
	log.Printf("PostgreSQL connected; Project query succeeded (%d projects)", len(rows))

	server := &http.Server{
		Addr:              addr,
		Handler:           api.NewRouter(projects),
		ReadHeaderTimeout: 5 * time.Second,
	}
	serveErrors := make(chan error, 1)
	go func() { serveErrors <- server.ListenAndServe() }()
	log.Printf("starting HTTP server on %s", addr)
	select {
	case serveErr := <-serveErrors:
		return fmt.Errorf("serve HTTP: %w", serveErr)
	case <-ctx.Done():
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		if shutdownErr := server.Shutdown(shutdownCtx); shutdownErr != nil {
			return errors.Join(fmt.Errorf("shutdown HTTP: %w", shutdownErr), server.Close())
		}
		if serveErr := <-serveErrors; !errors.Is(serveErr, http.ErrServerClosed) {
			return fmt.Errorf("stop HTTP: %w", serveErr)
		}
		log.Print("HTTP server stopped")
		return nil
	}
}
