package dto

import "github.com/google/uuid"

type ResolvedIDs struct {
	IDs      []uuid.UUID
	Failures []error
}

func (r ResolvedIDs) Len() int { return len(r.IDs) }

func (r ResolvedIDs) Failure(index int) error {
	if index < 0 || index >= len(r.Failures) {
		return nil
	}
	return r.Failures[index]
}
