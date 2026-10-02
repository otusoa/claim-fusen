package database

import (
	"context"
	"database/sql"
	"fmt"

	"api/ent"
	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "github.com/lib/pq"
)

// Open connects to PostgreSQL. Schema migration is an explicit, separate step.
func Open(ctx context.Context, url string) (*ent.Client, error) {
	if url == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	pool, err := sql.Open("postgres", url)
	if err != nil {
		// ドライバの解析エラーには認証情報を含む元のURLが入る場合がある。
		return nil, fmt.Errorf("invalid PostgreSQL connection configuration; check DATABASE_URL")
	}
	if err := pool.PingContext(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("connect PostgreSQL: %w", err)
	}
	return ent.NewClient(ent.Driver(entsql.OpenDB(dialect.Postgres, pool))), nil
}
