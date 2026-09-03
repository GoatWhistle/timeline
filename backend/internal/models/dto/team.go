package dto

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type TeamResponse struct {
	ID        string      `json:"id" example:"tm_42ej2s5gh7e8"`
	Name      string      `json:"name" example:"Night shift"`
	Lead      UserSummary `json:"lead"`
	IsLead    bool        `json:"is_lead" example:"true"`
	MyState   string      `json:"my_state" enums:"INVITED,ACTIVE,LEFT" example:"ACTIVE"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

type TeamMemberResponse struct {
	ID        string                 `json:"id" example:"tb_42ej2s5gh7e8"`
	TeamID    string                 `json:"team_id" example:"tm_42ej2s5gh7e8"`
	User      UserSummary            `json:"user"`
	State     models.TeamMemberState `json:"state" enums:"INVITED,ACTIVE,LEFT"`
	IsLead    bool                   `json:"is_lead" example:"false"`
	InvitedAt time.Time              `json:"invited_at"`
	JoinedAt  *time.Time             `json:"joined_at,omitempty"`
	LeftAt    *time.Time             `json:"left_at,omitempty"`
}

type TeamDetailResponse struct {
	Team    TeamResponse         `json:"team"`
	Members []TeamMemberResponse `json:"members"`
}

type TeamListResponse struct {
	Items []TeamResponse `json:"items"`
}

type CreateTeamRequest struct {
	Name string `json:"name" example:"Night shift"`
}

type RenameTeamRequest struct {
	Name string `json:"name" example:"Day shift"`
}

type InviteTeamMemberRequest struct {
	UserID   *string `json:"user_id,omitempty" example:"us_42ej2s5gh7e8"`
	Nickname *string `json:"nickname,omitempty" example:"jsmith"`
	Email    *string `json:"email,omitempty" example:"ivan@example.com"`
}

type TeamJoinLinkResponse struct {
	ID        string     `json:"id,omitempty" example:"tj_42ej2s5gh7e8"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	Active    bool       `json:"active" example:"true"`
}

type TeamJoinLinkSecretResponse struct {
	ID        string    `json:"id" example:"tj_42ej2s5gh7e8"`
	Token     string    `json:"token" example:"h9Qx1s3vT7c..."`
	URL       string    `json:"url" example:"https://timeline.example/teams/join/h9Qx1s3vT7c"`
	ExpiresAt time.Time `json:"expires_at"`
}

type EnterEventRequest struct {
	EventID string  `json:"event_id" example:"ev_gma9hq8a96q5"`
	TrackID *string `json:"track_id,omitempty" example:"tr_42ej2s5gh7e8"`
}

type TeamRosterMemberResponse struct {
	ID                 string                          `json:"id" example:"tp_42ej2s5gh7e8"`
	MemberID           string                          `json:"member_id" example:"tb_42ej2s5gh7e8"`
	User               UserSummary                     `json:"user"`
	State              models.TeamMemberState          `json:"state" enums:"INVITED,ACTIVE,LEFT"`
	IsLead             bool                            `json:"is_lead" example:"false"`
	Assigned           bool                            `json:"assigned" example:"true"`
	RegistrationStatus *models.RegistrationStatusValue `json:"registration_status,omitempty" enums:"TODO,DONE,NOT_REQUIRED"`
}

type TeamEventEntryResponse struct {
	ID              string                     `json:"id" example:"te_42ej2s5gh7e8"`
	TeamID          string                     `json:"team_id" example:"tm_42ej2s5gh7e8"`
	EventID         string                     `json:"event_id" example:"ev_gma9hq8a96q5"`
	EventTitle      string                     `json:"event_title" example:"National hackathon"`
	Track           *EventTrackSummary         `json:"track,omitempty"`
	Tracks          []EventTrackSummary        `json:"tracks"`
	TrackLocked     bool                       `json:"track_locked" example:"false"`
	EnteredAt       time.Time                  `json:"entered_at"`
	RosterSize      int                        `json:"roster_size" example:"4"`
	AssignedMembers int                        `json:"assigned_members" example:"4"`
	RegisteredCount int                        `json:"registered_count" example:"3"`
	TeamSizeMin     *int                       `json:"team_size_min,omitempty" example:"3"`
	TeamSizeMax     *int                       `json:"team_size_max,omitempty" example:"5"`
	Registered      bool                       `json:"registered" example:"true"`
	Roster          []TeamRosterMemberResponse `json:"roster"`
}

type TeamEventEntryListResponse struct {
	Items []TeamEventEntryResponse `json:"items"`
}
