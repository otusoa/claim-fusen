package main

import (
	"context"
	"log"
	"os"
	"time"

	"api/ent"
	_ "github.com/lib/pq"
)

func main() {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL is required; use a fresh development database, not a Drizzle-managed database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	client, err := ent.Open("postgres", url)
	if err != nil {
		log.Fatal(err)
	}
	defer client.Close()
	if err := client.Schema.Create(ctx); err != nil {
		log.Fatal(err)
	}
	log.Print("Ent schema migration completed")
}
