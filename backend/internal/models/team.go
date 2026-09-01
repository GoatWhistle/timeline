package models

import (
	"time"

	"github.com/google/uuid"
)

type Team struct {
	ID         uuid.UUID `json:"id"`
	DisplayID  string    `json:"display_id"`
	Name       string    `json:"name"`
	LeadUserID uuid.UUID `json:"lead_user_id"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (t *Team) LedBy(userID uuid.UUID) bool { return t.LeadUserID == userID }

type TeamMember struct {
	ID        uuid.UUID       `json:"id"`
	DisplayID string          `json:"display_id"`
	TeamID    uuid.UUID       `json:"team_id"`
	UserID    uuid.UUID       `json:"user_id"`
	State     TeamMemberState `json:"state"`
	InvitedAt time.Time       `json:"invited_at"`
	JoinedAt  *time.Time      `json:"joined_at,omitempty"`
	LeftAt    *time.Time      `json:"left_at,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

func (m *TeamMember) Active() bool { return m.State == TeamMemberActive }

type TeamEventEntry struct {
	ID        uuid.UUID `json:"id"`
	DisplayID string    `json:"display_id"`
	TeamID    uuid.UUID `json:"team_id"`
	EventID   uuid.UUID `json:"event_id"`
	EnteredAt time.Time `json:"entered_at"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TeamEventRosterEntry struct {
	ID        uuid.UUID `json:"id"`
	DisplayID string    `json:"display_id"`
	EntryID   uuid.UUID `json:"entry_id"`
	MemberID  uuid.UUID `json:"member_id"`
	TeamID    uuid.UUID `json:"team_id"`
	AddedAt   time.Time `json:"added_at"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TeamEventStanding struct {
	RosterSize      int
	AssignedMembers int
	RegisteredCount int
	TeamSizeMin     *int
	TeamSizeMax     *int
}

func (s TeamEventStanding) Registered() bool {
	if s.TeamSizeMin == nil {
		return false
	}
	return s.RegisteredCount >= *s.TeamSizeMin
}
