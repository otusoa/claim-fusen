package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	entschema "entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type ClaimEvidence struct{ ent.Schema }

const (
	RelationSupports       = "supports"
	RelationChallenges     = "challenges"
	RelationContextualizes = "contextualizes"
	RelationCorresponds    = "corresponds"
)

func (ClaimEvidence) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("claim_id", uuid.UUID{}),
		field.UUID("evidence_id", uuid.UUID{}),
		field.Text("type"),
		field.Text("note").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable().SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
	}
}

func (ClaimEvidence) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("claim", Claim.Type).Field("claim_id").Unique().Required().Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("evidence", Evidence.Type).Field("evidence_id").Unique().Required().Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}

func (ClaimEvidence) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("claim_id", "evidence_id", "type").Unique(),
		index.Fields("evidence_id"),
	}
}

func (ClaimEvidence) Annotations() []entschema.Annotation {
	return []entschema.Annotation{entsql.Annotation{Table: "claim_evidences"}}
}
