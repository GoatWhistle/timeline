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
	ID        uuid.UUID  `json:"id"`
	DisplayID string     `json:"display_id"`
	TeamID    uuid.UUID  `json:"team_id"`
	EventID   uuid.UUID  `json:"event_id"`
	TrackID   *uuid.UUID `json:"track_id,omitempty"`
	EnteredAt time.Time  `json:"entered_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type TeamJoinLink struct {
	ID        uuid.UUID  `json:"id"`
	DisplayID string     `json:"display_id"`
	TeamID    uuid.UUID  `json:"team_id"`
	TokenHash string     `json:"-"`
	CreatedBy uuid.UUID  `json:"created_by"`
	ExpiresAt time.Time  `json:"expires_at"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (l *TeamJoinLink) Usable(now time.Time) bool {
	return l.RevokedAt == nil && now.Before(l.ExpiresAt)
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
