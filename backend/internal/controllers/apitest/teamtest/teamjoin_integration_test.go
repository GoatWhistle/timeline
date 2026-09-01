//go:build integration

package teamtest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestTheLeadInvitesByNicknameAndByEmail(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 0, nil, nil)

	nickname := "mate" + strings.ReplaceAll(uuid.NewString(), "-", "")[:10]
	setNickname(s, t, f.Outsider.ID, nickname)

	support.RequireStatus(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"nickname": nickname}), http.StatusOK, "inviting by nickname")
	if detail := readTeam(f.LeadClient, t, f.TeamID); len(detail.Members) != 2 {
		t.Fatalf("inviting by nickname left %d members", len(detail.Members))
	}

	byEmail := s.Register(t, "byemail-"+strings.ReplaceAll(uuid.NewString(), "-", "")+"@example.com")
	support.RequireStatus(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"email": byEmail.Email}), http.StatusOK, "inviting by email")
	if detail := readTeam(f.LeadClient, t, f.TeamID); len(detail.Members) != 3 {
		t.Fatalf("inviting by email left %d members", len(detail.Members))
	}
}

func TestAnUnknownIdentityAnswersTheSameWhicheverWayItIsNamed(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 0, nil, nil)

	byNickname := f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"nickname": "nobodyusesthisname"})
	support.RequireErrorCode(t, byNickname, http.StatusNotFound, "not_found", "inviting an unused nickname")

	byEmail := f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"email": "nobody-" + strings.ReplaceAll(uuid.NewString(), "-", "") + "@example.com"})
	support.RequireErrorCode(t, byEmail, http.StatusNotFound, "not_found", "inviting an unregistered address")

	if errorMessage(t, byNickname) != errorMessage(t, byEmail) {
		t.Fatalf("an unknown nickname and an unregistered address answer differently: %s vs %s",
			byNickname.Body, byEmail.Body)
	}
}

func TestAnInvitationNamesExactlyOneIdentity(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 0, nil, nil)

	support.RequireErrorCode(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations", map[string]any{}),
		http.StatusBadRequest, "validation_failed", "inviting nobody in particular")

	support.RequireErrorCode(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"user_id": f.Outsider.ID, "email": f.Outsider.Email}),
		http.StatusBadRequest, "validation_failed", "inviting by two identities at once")

	if detail := readTeam(f.LeadClient, t, f.TeamID); len(detail.Members) != 1 {
		t.Fatalf("the refused invitations changed the roster to %d members", len(detail.Members))
	}
}

func TestTheJoinLinkIsIssuedOnceRotatedAndRevokedByTheLead(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 0, nil, nil)

	if link := readJoinLink(f.LeadClient, t, f.TeamID); link.Active {
		t.Fatalf("a fresh team already carries an active join link: %+v", link)
	}

	first := rotateJoinLink(f.LeadClient, t, f.TeamID)
	if first.Token == "" {
		t.Fatalf("the rotation returned no token: %+v", first)
	}
	if !strings.Contains(first.URL, first.Token) {
		t.Fatalf("the returned address does not carry the token: %+v", first)
	}
	if link := readJoinLink(f.LeadClient, t, f.TeamID); !link.Active || link.ID != first.ID {
		t.Fatalf("the issued link does not show up as active: %+v", link)
	}

	joiner := s.Session(t, f.Outsider)
	second := rotateJoinLink(f.LeadClient, t, f.TeamID)
	if second.Token == first.Token {
		t.Fatalf("the rotation reissued the same token")
	}
	support.RequireErrorCode(t, joiner.Post("/team-join/"+first.Token, nil),
		http.StatusNotFound, "not_found", "joining through a rotated-away link")

	support.RequireStatus(t, joiner.Post("/team-join/"+second.Token, nil),
		http.StatusOK, "joining through the current link")

	support.RequireStatus(t, f.LeadClient.Delete("/teams/"+f.TeamID+"/join-link"),
		http.StatusNoContent, "revoking the join link")
	if link := readJoinLink(f.LeadClient, t, f.TeamID); link.Active {
		t.Fatalf("the revoked link still shows as active: %+v", link)
	}

	another := s.Register(t, "late-"+strings.ReplaceAll(uuid.NewString(), "-", "")+"@example.com")
	lateJoiner := s.Session(t, another)
	support.RequireErrorCode(t, lateJoiner.Post("/team-join/"+second.Token, nil),
		http.StatusNotFound, "not_found", "joining through a revoked link")
}

func TestJoiningThroughALinkMakesAnActiveMemberAndIsIdempotent(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 0, nil, nil)
	link := rotateJoinLink(f.LeadClient, t, f.TeamID)

	joiner := s.Session(t, f.Outsider)
	support.RequireStatus(t, joiner.Post("/team-join/"+link.Token, nil),
		http.StatusOK, "joining through the link")
	if detail := readTeam(joiner, t, f.TeamID); detail.Team.MyState != "ACTIVE" {
		t.Fatalf("joining through the link left the membership at %q", detail.Team.MyState)
	}

	support.RequireStatus(t, joiner.Post("/team-join/"+link.Token, nil),
		http.StatusOK, "joining a second time")
	if detail := readTeam(f.LeadClient, t, f.TeamID); len(detail.Members) != 2 {
		t.Fatalf("joining twice produced %d members", len(detail.Members))
	}
}

func TestOnlyTheLeadManagesTheJoinLinkAndAnUnknownTokenLeaksNothing(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	mate := s.Session(t, f.Mates[0])
	support.RequireErrorCode(t, mate.Get("/teams/"+f.TeamID+"/join-link"),
		http.StatusForbidden, "forbidden", "a plain member reading the join link")
	support.RequireErrorCode(t, mate.Post("/teams/"+f.TeamID+"/join-link", nil),
		http.StatusForbidden, "forbidden", "a plain member rotating the join link")
	support.RequireErrorCode(t, mate.Delete("/teams/"+f.TeamID+"/join-link"),
		http.StatusForbidden, "forbidden", "a plain member revoking the join link")

	outsider := s.Session(t, f.Outsider)
	support.RequireErrorCode(t, outsider.Get("/teams/"+f.TeamID+"/join-link"),
		http.StatusNotFound, "not_found", "an outsider reading somebody else's join link")
	support.RequireErrorCode(t, outsider.Post("/team-join/mgv7hq8a96q5mgv7hq8a96q5", nil),
		http.StatusNotFound, "not_found", "joining through a token nobody issued")
}

func TestTheJoinLinkTokenNeverReachesTheDatabaseInClear(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 0, nil, nil)
	link := rotateJoinLink(f.LeadClient, t, f.TeamID)

	var stored string
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT token_hash FROM team_join_links WHERE display_id = $1`, link.ID).Scan(&stored); err != nil {
		t.Fatalf("reading the stored join link: %v", err)
	}
	if stored == link.Token {
		t.Fatalf("the raw token is stored in the database")
	}
	if strings.Contains(stored, link.Token) {
		t.Fatalf("the stored value carries the raw token: %q", stored)
	}
}
