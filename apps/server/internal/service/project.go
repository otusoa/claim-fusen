package service

import (
	"context"
	"fmt"

	"api/ent"
)

type ProjectService struct {
	client *ent.Client
}

func NewProjectService(client *ent.Client) *ProjectService {
	return &ProjectService{client: client}
}

func (s *ProjectService) List(ctx context.Context) ([]*ent.Project, error) {
	projects, err := s.client.Project.Query().All(ctx)
	if err != nil {
		return nil, fmt.Errorf("query projects: %w", err)
	}
	return projects, nil
}
