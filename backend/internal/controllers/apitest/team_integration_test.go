//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestTeamCreatorBecomesTheLeadAndTheFirstActiveMember(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 0, nil, nil)

	detail := readTeam(f.LeadClient, t, f.TeamID)
	if !detail.Team.IsLead {
		t.Fatalf("the creator is not marked as the lead: %+v", detail.Team)
	}
	if detail.Team.Lead.ID != f.Lead.ID {
		t.Fatalf("the lead is %q instead of the creator %q", detail.Team.Lead.ID, f.Lead.ID)
	}
	if detail.Team.MyState != "ACTIVE" {
		t.Fatalf("the creator's own membership is %q instead of ACTIVE", detail.Team.MyState)
	}
	if len(detail.Members) != 1 {
		t.Fatalf("a fresh team holds %d members instead of the lead alone", len(detail.Members))
	}
	if !detail.Members[0].IsLead || detail.Members[0].State != "ACTIVE" {
		t.Fatalf("the only member is not the active lead: %+v", detail.Members[0])
	}
}

func TestTeamIsInvisibleToEveryoneOutsideIt(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	outsider := s.Session(t, f.Outsider)
	requireErrorCode(t, outsider.Get("/teams/"+f.TeamID),
		http.StatusNotFound, "not_found", "an outsider reading somebody else's team")

	requireErrorCode(t, f.AdminClient.Get("/teams/"+f.TeamID),
		http.StatusNotFound, "not_found", "an administrator reading a team they do not belong to")

	mate := s.Session(t, f.Mates[0])
	support.RequireStatus(t, mate.Get("/teams/"+f.TeamID), http.StatusOK,
		"a member reading their own team")
}

func TestOnlyTheLeadRenamesAndInvites(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	mate := s.Session(t, f.Mates[0])
	requireErrorCode(t, mate.Patch("/teams/"+f.TeamID, map[string]any{"name": "Taken over"}),
		http.StatusForbidden, "forbidden", "a plain member renaming the team")
	requireErrorCode(t, mate.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"user_id": f.Outsider.ID}),
		http.StatusForbidden, "forbidden", "a plain member inviting into the team")

	if detail := readTeam(f.LeadClient, t, f.TeamID); len(detail.Members) != 2 {
		t.Fatalf("the refused invitation changed the roster to %d members", len(detail.Members))
	}

	support.RequireStatus(t, f.LeadClient.Patch("/teams/"+f.TeamID,
		map[string]any{"name": "Day shift"}), http.StatusOK, "the lead renaming the team")
	if detail := readTeam(f.LeadClient, t, f.TeamID); detail.Team.Name != "Day shift" {
		t.Fatalf("the rename left the name at %q", detail.Team.Name)
	}
}

func TestInvitationStaysPendingUntilTheInvitedUserAccepts(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 0, nil, nil)

	support.RequireStatus(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"user_id": f.Outsider.ID}), http.StatusOK, "inviting the outsider")

	invited := s.Session(t, f.Outsider)
	detail := readTeam(invited, t, f.TeamID)
	if detail.Team.MyState != "INVITED" {
		t.Fatalf("the invited user's membership is %q instead of INVITED", detail.Team.MyState)
	}
	if detail.Team.IsLead {
		t.Fatalf("the invited user is marked as the lead: %+v", detail.Team)
	}

	support.RequireStatus(t, invited.Post("/teams/"+f.TeamID+"/membership", nil),
		http.StatusOK, "accepting the invitation")
	if after := readTeam(invited, t, f.TeamID); after.Team.MyState != "ACTIVE" {
		t.Fatalf("accepting left the membership at %q", after.Team.MyState)
	}

	support.RequireStatus(t, invited.Post("/teams/"+f.TeamID+"/membership", nil),
		http.StatusOK, "accepting a second time")
}

func TestInvitingTheSameUserTwiceIsRefusedAsAConflict(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	requireErrorCode(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"user_id": f.Mates[0].ID}),
		http.StatusConflict, "already_member", "inviting a user who is already in the team")
}

func TestALeftMemberLosesTheTeamAndTheLeadCannotLeave(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	requireErrorCode(t, f.LeadClient.Delete("/teams/"+f.TeamID+"/membership"),
		http.StatusConflict, "invalid_state_transition", "the lead leaving their own team")

	mate := s.Session(t, f.Mates[0])
	support.RequireStatus(t, mate.Delete("/teams/"+f.TeamID+"/membership"),
		http.StatusNoContent, "a member leaving the team")
	requireErrorCode(t, mate.Get("/teams/"+f.TeamID),
		http.StatusNotFound, "not_found", "a former member reading the team they left")

	if detail := readTeam(f.LeadClient, t, f.TeamID); len(detail.Members) != 2 {
		t.Fatalf("the roster lost the LEFT row instead of keeping its history: %+v", detail.Members)
	}
}

func TestTheLeadRemovesAMemberButNotThemselves(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	requireErrorCode(t, f.LeadClient.Delete("/teams/"+f.TeamID+"/members/"+f.Lead.ID),
		http.StatusConflict, "invalid_state_transition", "the lead removing themselves")

	support.RequireStatus(t, f.LeadClient.Delete("/teams/"+f.TeamID+"/members/"+f.Mates[0].ID),
		http.StatusOK, "the lead removing a member")

	mate := s.Session(t, f.Mates[0])
	requireErrorCode(t, mate.Get("/teams/"+f.TeamID),
		http.StatusNotFound, "not_found", "the removed member reading the team")
}

func TestOwnTeamsListingCarriesInvitationsAndDropsTeamsLeft(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	support.RequireStatus(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"user_id": f.Outsider.ID}), http.StatusOK, "inviting the outsider")

	invited := s.Session(t, f.Outsider)
	var listing struct {
		Items []struct {
			ID      string `json:"id"`
			MyState string `json:"my_state"`
		} `json:"items"`
	}
	resp := invited.Get("/teams")
	support.RequireStatus(t, resp, http.StatusOK, "listing own teams")
	resp.Decode(t, &listing)
	if len(listing.Items) != 1 || listing.Items[0].MyState != "INVITED" {
		t.Fatalf("the invited user's listing is %+v instead of one INVITED team", listing.Items)
	}

	support.RequireStatus(t, invited.Post("/teams/"+f.TeamID+"/membership", nil),
		http.StatusOK, "accepting the invitation")
	support.RequireStatus(t, invited.Delete("/teams/"+f.TeamID+"/membership"),
		http.StatusNoContent, "leaving the team again")

	resp = invited.Get("/teams")
	support.RequireStatus(t, resp, http.StatusOK, "listing own teams after leaving")
	resp.Decode(t, &listing)
	if len(listing.Items) != 0 {
		t.Fatalf("a team the user left is still listed: %+v", listing.Items)
	}
}
