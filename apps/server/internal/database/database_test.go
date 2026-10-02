package database_test

import (
	"context"
	"os"
	"testing"
	"time"

	"api/ent"
	"api/ent/claimevidence"
	"api/ent/schema"
	"api/internal/database"
	"github.com/google/uuid"
)

// Run only against a disposable PostgreSQL database. No production URL fallback.
func TestPostgresSchema(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set TEST_DATABASE_URL to a disposable PostgreSQL database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	client, err := database.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()
	if err := client.Schema.Create(ctx); err != nil {
		t.Fatal(err)
	}
	// Applying the same schema twice must be safe.
	if err := client.Schema.Create(ctx); err != nil {
		t.Fatal(err)
	}

	project, err := client.Project.Create().SetTitle("『御教誡』に見る神理教の生活倫理").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	source, err := client.Source.Create().SetTitle("『本教大意』").SetMetadata(map[string]interface{}{"author": "神理教大教庁"}).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// Delete the Project first so Source is no longer referenced during cleanup.
	defer func() {
		client.Project.DeleteOneID(project.ID).Exec(context.Background())
		client.Source.DeleteOneID(source.ID).Exec(context.Background())
	}()
	claim, err := client.Claim.Create().SetProject(project).
		SetTitle("「家業を怠ることなかれ」は、単なる勤労倫理ではなく、神を敬うための日常的実践でもある").
		SetUpdatedAt(time.Unix(0, 0)).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	evidence, err := client.Evidence.Create().SetProject(project).SetSource(source).
		SetQuote("「役仕勧業怠る時なく」").SetLocator("3頁").
		SetSummary("家業・職務を怠らないことが、神を敬う具体的行為として示されている。").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	relation, err := client.ClaimEvidence.Create().SetClaim(claim).SetEvidence(evidence).
		SetType(schema.RelationSupports).SetNote("日常的実践を示す史料箇所").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if project.ID == uuid.Nil || claim.ID == uuid.Nil || source.ID == uuid.Nil || evidence.ID == uuid.Nil || relation.ID == uuid.Nil {
		t.Fatal("IDs must be generated UUIDs")
	}
	if claim.Status != schema.ClaimStatusActive || relation.CreatedAt.IsZero() {
		t.Fatal("creation defaults were not applied")
	}

	gotSource, err := claim.QueryClaimEvidences().QueryEvidence().QuerySource().Only(ctx)
	if err != nil || gotSource.ID != source.ID {
		t.Fatalf("Claim -> ClaimEvidence -> Evidence -> Source: source=%v err=%v", gotSource, err)
	}
	gotEvidence, err := claim.QueryEvidences().Only(ctx)
	if err != nil || gotEvidence.ID != evidence.ID || gotEvidence.Quote == nil || *gotEvidence.Quote != "「役仕勧業怠る時なく」" {
		t.Fatalf("Through edge retrieval failed: evidence=%v err=%v", gotEvidence, err)
	}
	gotClaim, err := evidence.QueryClaims().Only(ctx)
	if err != nil || gotClaim.ID != claim.ID {
		t.Fatalf("reverse Through edge failed: claim=%v err=%v", gotClaim, err)
	}
	if n, err := source.QueryEvidences().Count(ctx); err != nil || n != 1 {
		t.Fatalf("Source -> Evidence: count=%d err=%v", n, err)
	}
	if n, err := project.QueryClaims().Count(ctx); err != nil || n != 1 {
		t.Fatalf("Project -> Claim: count=%d err=%v", n, err)
	}
	if n, err := project.QueryEvidences().Count(ctx); err != nil || n != 1 {
		t.Fatalf("Project -> Evidence: count=%d err=%v", n, err)
	}
	updated, err := claim.Update().SetBody("追記").Save(ctx)
	// Compare persisted times: PostgreSQL timestamps have microsecond precision.
	if err != nil || !updated.UpdatedAt.After(claim.UpdatedAt) || !updated.CreatedAt.Equal(gotClaim.CreatedAt) {
		t.Fatalf("timestamps on update: claim=%v err=%v", updated, err)
	}
	if _, err := client.ClaimEvidence.Create().SetClaim(claim).SetEvidence(evidence).SetType(schema.RelationContextualizes).Save(ctx); err != nil {
		t.Fatalf("same pair with a different relation type must be allowed: %v", err)
	}
	if _, err := client.ClaimEvidence.Create().SetClaim(claim).SetEvidence(evidence).SetType(schema.RelationSupports).Save(ctx); !ent.IsConstraintError(err) {
		t.Fatalf("duplicate relation should be rejected: %v", err)
	}
	if err := client.Source.DeleteOne(source).Exec(ctx); !ent.IsConstraintError(err) {
		t.Fatalf("referenced Source deletion must be restricted: %v", err)
	}
	if err := client.Claim.DeleteOne(claim).Exec(ctx); err != nil {
		t.Fatal(err)
	}
	if n, err := client.ClaimEvidence.Query().Where(claimevidence.ClaimID(claim.ID)).Count(ctx); err != nil || n != 0 {
		t.Fatalf("Claim deletion must cascade to relations: count=%d err=%v", n, err)
	}
	if _, err := client.Evidence.Get(ctx, evidence.ID); err != nil {
		t.Fatalf("Claim deletion must preserve Evidence: %v", err)
	}

	claim2, err := client.Claim.Create().SetProject(project).SetTitle("二つ目の主張").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.ClaimEvidence.Create().SetClaim(claim2).SetEvidence(evidence).SetType(schema.RelationChallenges).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err := client.Evidence.DeleteOne(evidence).Exec(ctx); err != nil {
		t.Fatal(err)
	}
	if n, err := claim2.QueryClaimEvidences().Count(ctx); err != nil || n != 0 {
		t.Fatalf("Evidence deletion must cascade to relations: count=%d err=%v", n, err)
	}
	evidence2, err := client.Evidence.Create().SetProject(project).SetSource(source).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.ClaimEvidence.Create().SetClaim(claim2).SetEvidence(evidence2).SetType("future_relation_type").Save(ctx); err != nil {
		t.Fatalf("relation vocabulary must remain extensible: %v", err)
	}
	if err := client.Project.DeleteOne(project).Exec(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := client.Claim.Get(ctx, claim2.ID); !ent.IsNotFound(err) {
		t.Fatalf("Project deletion must cascade to Claims: %v", err)
	}
	if _, err := client.Evidence.Get(ctx, evidence2.ID); !ent.IsNotFound(err) {
		t.Fatalf("Project deletion must cascade to Evidences: %v", err)
	}
	if n, err := client.ClaimEvidence.Query().Where(claimevidence.ClaimID(claim2.ID)).Count(ctx); err != nil || n != 0 {
		t.Fatalf("Project deletion must cascade to relations: count=%d err=%v", n, err)
	}
	if _, err := client.Source.Get(ctx, source.ID); err != nil {
		t.Fatalf("Project deletion must preserve Source: %v", err)
	}
}
