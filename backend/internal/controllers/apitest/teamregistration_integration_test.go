//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestTeamCountsAsRegisteredOnlyOnceTheMinimumSizeIsReached(t *testing.T) {
	s := support.NewStack(t)
	minimum := 3
	f := seedTeam(s, t, 3, &minimum, nil)

	entered := enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	if entered.RosterSize != 0 {
		t.Fatalf("a fresh entry arrived with %d on the roster instead of none", entered.RosterSize)
	}
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID,
		f.Lead.ID, f.Mates[0].ID, f.Mates[1].ID, f.Mates[2].ID)

	standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if standing.RosterSize != 4 {
		t.Fatalf("the roster holds %d instead of 4", standing.RosterSize)
	}
	if standing.RegisteredCount != 0 || standing.Registered {
		t.Fatalf("a lineup nobody reported for is already registered: %+v", standing)
	}

	support.RequireStatus(t, f.LeadClient.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the lead reporting their own registration")
	if one := readStanding(f.LeadClient, t, f.TeamID, f.EventID); one.Registered {
		t.Fatalf("one report of three reached the threshold: %+v", one)
	}

	first := s.Session(t, f.Mates[0])
	support.RequireStatus(t, first.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the first mate reporting their own registration")
	two := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if two.RegisteredCount != 2 {
		t.Fatalf("two reports counted as %d", two.RegisteredCount)
	}
	if two.Registered {
		t.Fatalf("two reports of three reached the threshold: %+v", two)
	}

	second := s.Session(t, f.Mates[1])
	support.RequireStatus(t, second.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the second mate reporting their own registration")
	reached := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if reached.RegisteredCount != 3 {
		t.Fatalf("three reports counted as %d", reached.RegisteredCount)
	}
	if !reached.Registered {
		t.Fatalf("the threshold of %d was reached but the team is not registered: %+v",
			minimum, reached)
	}
}

func TestOnlyTheRosterCountsTowardsTheThreshold(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 2, &minimum, nil)

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)

	support.RequireStatus(t, f.LeadClient.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the lead reporting")
	offRoster := s.Session(t, f.Mates[1])
	support.RequireStatus(t, offRoster.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "a teammate outside the lineup reporting")

	standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if standing.RosterSize != 2 {
		t.Fatalf("the roster grew to %d when a non-member reported", standing.RosterSize)
	}
	if standing.RegisteredCount != 1 {
		t.Fatalf("a report from outside the lineup counted: %+v", standing)
	}
	if standing.Registered {
		t.Fatalf("a report from outside the lineup reached the threshold: %+v", standing)
	}

	onRoster := s.Session(t, f.Mates[0])
	support.RequireStatus(t, onRoster.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "a member of the lineup reporting")
	if reached := readStanding(f.LeadClient, t, f.TeamID, f.EventID); !reached.Registered {
		t.Fatalf("both lineup members reported but the team is not registered: %+v", reached)
	}
}

func TestTakingAMemberOffTheRosterUndoesTheDerivedRegistration(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 1, &minimum, nil)

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)
	support.RequireStatus(t, f.LeadClient.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the lead reporting")
	mate := s.Session(t, f.Mates[0])
	support.RequireStatus(t, mate.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the mate reporting")
	if standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID); !standing.Registered {
		t.Fatalf("both lineup members reported but the team is not registered: %+v", standing)
	}

	support.RequireStatus(t, removeFromRoster(f.LeadClient, f.TeamID, f.EventID, f.Mates[0].ID),
		http.StatusOK, "taking the mate off the lineup")

	after := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if after.RosterSize != 1 || after.RegisteredCount != 1 {
		t.Fatalf("the shrunken lineup reads %+v instead of one member and one report", after)
	}
	if after.Registered {
		t.Fatalf("a lineup below the threshold stayed registered: %+v", after)
	}
	if value := statusValueOf(s, t, f.EventID, f.Mates[0].ID); value != "DONE" {
		t.Fatalf("leaving the lineup rewrote the member's own status to %q", value)
	}
}

func TestARosterNeverGrowsPastTheMaximumTeamSize(t *testing.T) {
	s := support.NewStack(t)
	minimum, maximum := 2, 2
	f := seedTeam(s, t, 2, &minimum, &maximum)

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)

	requireErrorCode(t, addToRoster(f.LeadClient, f.TeamID, f.EventID, f.Mates[1].ID),
		http.StatusConflict, "roster_full", "adding a third member to a lineup capped at two")
	if standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID); standing.RosterSize != 2 {
		t.Fatalf("the refused addition left %d on the lineup", standing.RosterSize)
	}

	support.RequireStatus(t, removeFromRoster(f.LeadClient, f.TeamID, f.EventID, f.Mates[0].ID),
		http.StatusOK, "freeing a place on the lineup")
	support.RequireStatus(t, addToRoster(f.LeadClient, f.TeamID, f.EventID, f.Mates[1].ID),
		http.StatusOK, "adding the third member into the freed place")
}

func TestAnUnderFilledRosterIsAllowedAndSimplyNotRegistered(t *testing.T) {
	s := support.NewStack(t)
	minimum := 3
	f := seedTeam(s, t, 1, &minimum, nil)

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID)
	support.RequireStatus(t, f.LeadClient.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the only lineup member reporting")

	standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if standing.RosterSize != 1 || standing.RegisteredCount != 1 {
		t.Fatalf("the lineup reads %+v instead of one member who reported", standing)
	}
	if standing.Registered {
		t.Fatalf("a lineup of one under a threshold of three is registered: %+v", standing)
	}
}

func TestDerivedRegistrationFollowsAStatusMovedBackOutOfDone(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 1, &minimum, nil)

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)
	support.RequireStatus(t, f.LeadClient.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the lead reporting")
	mate := s.Session(t, f.Mates[0])
	support.RequireStatus(t, mate.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the mate reporting")

	if standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID); !standing.Registered {
		t.Fatalf("both members reported but the team is not registered: %+v", standing)
	}

	statusID := statusDisplayID(s, t, f.EventID, f.Mates[0].ID)
	forceStatus(f.AdminClient, t, statusID, "TODO")

	after := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if after.RegisteredCount != 1 {
		t.Fatalf("returning one status to TODO left the count at %d", after.RegisteredCount)
	}
	if after.Registered {
		t.Fatalf("the team stayed registered after a member's status left DONE: %+v", after)
	}
}

func TestAnEventWithoutAMinimumTeamSizeNeverDerivesRegistration(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)
	support.RequireStatus(t, f.LeadClient.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the lead reporting")
	mate := s.Session(t, f.Mates[0])
	support.RequireStatus(t, mate.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the mate reporting")

	standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if standing.TeamSizeMin != nil {
		t.Fatalf("the event carries a minimum team size of %d", *standing.TeamSizeMin)
	}
	if standing.RegisteredCount != 2 {
		t.Fatalf("both reports counted as %d", standing.RegisteredCount)
	}
	if standing.Registered {
		t.Fatalf("an event without a threshold derived a registered team: %+v", standing)
	}
}

func TestALeavingMemberIsDroppedFromEveryRoster(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 1, &minimum, nil)

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)

	mate := s.Session(t, f.Mates[0])
	support.RequireStatus(t, mate.Delete("/teams/"+f.TeamID+"/membership"),
		http.StatusNoContent, "the mate leaving the team")

	standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID)
	if standing.RosterSize != 1 {
		t.Fatalf("the lineup kept %d after a member left the team", standing.RosterSize)
	}
	for _, row := range standing.Roster {
		if row.User.ID == f.Mates[0].ID {
			t.Fatalf("the member who left the team is still on the lineup: %+v", row)
		}
	}
}
