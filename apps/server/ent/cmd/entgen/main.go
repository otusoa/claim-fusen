package main

import (
	"fmt"
	"log"

	"entgo.io/ent/entc"
	"entgo.io/ent/entc/gen"
)

func main() {
	if err := entc.Generate("./schema", &gen.Config{Hooks: []gen.Hook{relationTypeUniqueness}}); err != nil {
		log.Fatal(err)
	}
}

// Ent adds a unique (claim_id, evidence_id) index for Through edges.
// Our relation identity includes type, so keep the schema's three-column unique
// index instead. This changes the generation graph, never generated files.
func relationTypeUniqueness(next gen.Generator) gen.Generator {
	return gen.GenerateFunc(func(g *gen.Graph) error {
		for _, node := range g.Nodes {
			if node.Name != "ClaimEvidence" {
				continue
			}
			hasTypedIdentity := false
			for _, idx := range node.Indexes {
				if idx.Unique && len(idx.Columns) == 3 && idx.Columns[0] == "claim_id" && idx.Columns[1] == "evidence_id" && idx.Columns[2] == "type" {
					hasTypedIdentity = true
				}
			}
			if !hasTypedIdentity {
				return fmt.Errorf("ClaimEvidence must define a unique (claim_id, evidence_id, type) index")
			}
			indexes := node.Indexes[:0]
			for _, idx := range node.Indexes {
				if idx.Unique && len(idx.Columns) == 2 &&
					((idx.Columns[0] == "claim_id" && idx.Columns[1] == "evidence_id") ||
						(idx.Columns[0] == "evidence_id" && idx.Columns[1] == "claim_id")) {
					continue
				}
				indexes = append(indexes, idx)
			}
			node.Indexes = indexes
		}
		return next.Generate(g)
	})
}
