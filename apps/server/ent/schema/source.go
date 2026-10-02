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

type Source struct{ ent.Schema }

func (Source) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.Text("title"),
		field.Text("type").Optional().Nillable(),
		field.Int("year").Optional().Nillable().SchemaType(map[string]string{dialect.Postgres: "integer"}),
		field.Text("url").Optional().Nillable(),
		field.JSON("metadata", map[string]interface{}{}).Optional(),
		field.Time("created_at").Default(time.Now).Immutable().SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now).SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
	}
}

func (Source) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("evidences", Evidence.Type).Annotations(entsql.OnDelete(entsql.Restrict)),
	}
}

func (Source) Annotations() []entschema.Annotation {
	return []entschema.Annotation{entsql.Annotation{Table: "sources"}}
}
