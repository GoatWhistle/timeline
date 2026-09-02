package validation

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestValidateTeamRoleDropsTheRoleOfAMeetup(t *testing.T) {
	cases := []struct {
		name  string
		value string
	}{
		{"a stated role", "Backend"},
		{"a role carried over by a copied roster", "Team Lead"},
		{"a role with surrounding spaces", "  Designer  "},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			value := tc.value
			got, err := ValidateTeamRole(models.EventKindMeetup, &value)
			if err != nil {
				t.Fatalf("expected a meetup to accept the request, got %v", err)
			}
			if got != nil {
				t.Fatalf("a meetup stored the role %q; section 6 keeps it NULL", *got)
			}
		})
	}
}

func TestValidateTeamRoleKeepsTheRoleOfAHackathon(t *testing.T) {
	value := "  Backend  "
	got, err := ValidateTeamRole(models.EventKindHackathon, &value)
	if err != nil {
		t.Fatalf("expected a hackathon to accept a stated role, got %v", err)
	}
	if got == nil || *got != "Backend" {
		t.Fatalf("a hackathon lost the stated role: %v", got)
	}
}

func TestValidateTeamRoleRequiresARoleOfAHackathon(t *testing.T) {
	blank := "   "
	for _, value := range []*string{nil, &blank} {
		if _, err := ValidateTeamRole(models.EventKindHackathon, value); err == nil {
			t.Fatalf("a hackathon accepted a missing role")
		}
	}
}
