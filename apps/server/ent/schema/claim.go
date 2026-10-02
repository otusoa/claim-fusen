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

type Claim struct{ ent.Schema }

const (
	ClaimStatusDraft    = "draft"
	ClaimStatusActive   = "active"
	ClaimStatusArchived = "archived"
)

func (Claim) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("project_id", uuid.UUID{}),
		field.Text("title"),
		field.Text("body").Optional().Nillable(),
		field.Text("status").Default(ClaimStatusActive),
		field.Time("created_at").Default(time.Now).Immutable().SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now).SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
	}
}

func (Claim) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("project", Project.Type).Ref("claims").Field("project_id").Unique().Required(),
		edge.To("evidences", Evidence.Type).Through("claim_evidences", ClaimEvidence.Type),
	}
}

func (Claim) Indexes() []ent.Index {
	return []ent.Index{index.Fields("project_id")}
}

func (Claim) Annotations() []entschema.Annotation {
	return []entschema.Annotation{entsql.Annotation{Table: "claims"}}
}
