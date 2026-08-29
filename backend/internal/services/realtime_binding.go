package services

import "github.com/google/uuid"

type SessionDropper interface {
	DropSession(sessionID uuid.UUID) int
	DropUser(userID uuid.UUID) int
}

func (s *AuthService) WithRealtime(d SessionDropper) { s.realtime = d }

func (s *UserService) WithRealtime(d SessionDropper) { s.realtime = d }

func (s *ProfileService) WithRealtime(d SessionDropper) { s.realtime = d }

func (s *AuthService) dropSession(sessionID uuid.UUID) {
	if s.realtime != nil && sessionID != uuid.Nil {
		s.realtime.DropSession(sessionID)
	}
}

func (s *AuthService) dropUser(userID uuid.UUID) {
	if s.realtime != nil && userID != uuid.Nil {
		s.realtime.DropUser(userID)
	}
}

func (s *UserService) dropUser(userID uuid.UUID) {
	if s.realtime != nil && userID != uuid.Nil {
		s.realtime.DropUser(userID)
	}
}

func (s *ProfileService) dropUser(userID uuid.UUID) {
	if s.realtime != nil && userID != uuid.Nil {
		s.realtime.DropUser(userID)
	}
}
