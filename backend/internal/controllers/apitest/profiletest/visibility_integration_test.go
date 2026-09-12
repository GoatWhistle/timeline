//go:build integration

package profiletest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestMembersVisibilityHidesFromAnonymousButShowsToASignedInOutsider(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Patch("/me", map[string]any{
		"nickname": "members-only", "profile_visibility": "members",
	}), http.StatusOK, "setting members-only visibility")

	anon := s.Anonymous(t, "/profiles/members-only")
	support.RequireStatus(t, anon, http.StatusNotFound, "an anonymous visitor must not see a members-only profile")

	outsider := s.Session(t, f.Outsider)
	seen := outsider.Get("/profiles/members-only")
	support.RequireStatus(t, seen, http.StatusOK, "a signed-in outsider must see a members-only profile")
}

func TestPrivateVisibilityIsIndistinguishableFromMissingEvenWhenSignedIn(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Patch("/me", map[string]any{
		"nickname": "kept-private", "profile_visibility": "private",
	}), http.StatusOK, "setting private visibility")

	outsider := s.Session(t, f.Outsider)
	seen := outsider.Get("/profiles/kept-private")
	support.RequireStatus(t, seen, http.StatusNotFound, "a private profile must stay hidden from a signed-in outsider")
}

func TestOwnerAlwaysSeesTheirOwnProfileRegardlessOfVisibility(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Patch("/me", map[string]any{
		"nickname": "self-view", "profile_visibility": "private",
	}), http.StatusOK, "setting private visibility")

	seen := member.Get("/profiles/self-view")
	support.RequireStatus(t, seen, http.StatusOK, "the owner must always see their own profile")
}

func TestThemeRoundTripsThroughMe(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	support.RequireStatus(t, member.Patch("/me", map[string]any{"theme": "dark"}),
		http.StatusOK, "setting the theme")

	got := member.Get("/me")
	support.RequireStatus(t, got, http.StatusOK, "reading the profile back")
	if !support.ContainsAll(string(got.Body), `"theme":"dark"`) {
		t.Fatalf("theme did not round-trip through /me: %s", got.Body)
	}
}

func TestInvalidThemeIsRejected(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	resp := member.Patch("/me", map[string]any{"theme": "solarized"})
	support.RequireStatus(t, resp, http.StatusBadRequest, "an unknown theme must be rejected")
}

func TestPinningMoreThanThreeEventsIsRejected(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)
	s.ShowOnProfile(t, f.Member.ID)

	resp := member.Patch("/me", map[string]any{
		"pinned_event_ids": []string{f.EventID, f.EventID, f.EventID, f.EventID},
	})
	support.RequireStatus(t, resp, http.StatusBadRequest, "more than 3 pinned events must be rejected")
}

func TestPinningAnEventTheUserDidNotParticipateInIsRejected(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	resp := member.Patch("/me", map[string]any{
		"pinned_event_ids": []string{f.OtherEvent},
	})
	support.RequireStatus(t, resp, http.StatusBadRequest,
		"pinning an event the user did not participate in must be rejected")
}

func TestPinnedEventRoundTripsAsADisplayID(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)
	s.ShowOnProfile(t, f.Member.ID)

	resp := member.Patch("/me", map[string]any{
		"pinned_event_ids": []string{f.EventID},
	})
	support.RequireStatus(t, resp, http.StatusOK, "pinning an owned, shown, published event")
	if !support.ContainsAll(string(resp.Body), f.EventID) {
		t.Fatalf("the pinned event display id did not round-trip: %s", resp.Body)
	}

	got := member.Get("/me")
	support.RequireStatus(t, got, http.StatusOK, "reading the profile back")
	if !support.ContainsAll(string(got.Body), f.EventID) {
		t.Fatalf("the pinned event did not persist across a fresh /me read: %s", got.Body)
	}
}
