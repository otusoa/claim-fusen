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

type Evidence struct{ ent.Schema }

func (Evidence) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("project_id", uuid.UUID{}),
		field.UUID("source_id", uuid.UUID{}),
		field.Text("quote").Optional().Nillable(),
		field.Text("summary").Optional().Nillable(),
		field.Text("locator").Optional().Nillable(),
		field.Text("note").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable().SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now).SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
	}
}

func (Evidence) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("project", Project.Type).Ref("evidences").Field("project_id").Unique().Required(),
		edge.From("source", Source.Type).Ref("evidences").Field("source_id").Unique().Required(),
		edge.From("claims", Claim.Type).Ref("evidences").Through("claim_evidences", ClaimEvidence.Type),
	}
}

func (Evidence) Indexes() []ent.Index {
	return []ent.Index{index.Fields("project_id"), index.Fields("source_id")}
}

func (Evidence) Annotations() []entschema.Annotation {
	return []entschema.Annotation{entsql.Annotation{Table: "evidences"}}
}
