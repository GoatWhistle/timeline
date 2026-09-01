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
	UserID string `json:"user_id" example:"us_42ej2s5gh7e8"`
}

type EnterEventRequest struct {
	EventID string `json:"event_id" example:"ev_gma9hq8a96q5"`
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
