package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	entschema "entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

type Project struct{ ent.Schema }

func (Project) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.Text("title"),
		field.Text("description").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable().SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now).SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
	}
}

func (Project) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("claims", Claim.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
		edge.To("evidences", Evidence.Type).Annotations(entsql.OnDelete(entsql.Cascade)),
	}
}

func (Project) Annotations() []entschema.Annotation {
	return []entschema.Annotation{entsql.Annotation{Table: "projects"}}
}
