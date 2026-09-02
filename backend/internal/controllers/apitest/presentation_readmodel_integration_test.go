//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestMyEventsCarriesTheSameEventColourAsTheSchedule(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)

	scheduleResp := member.Get("/me/schedule")
	support.RequireStatus(t, scheduleResp, http.StatusOK, "reading the own schedule")
	var schedule struct {
		Rows []struct {
			EventID string `json:"event_id"`
			Color   *struct {
				Family string `json:"family"`
				Slot   int    `json:"slot"`
			} `json:"color"`
		} `json:"rows"`
	}
	scheduleResp.Decode(t, &schedule)

	var wantFamily string
	var wantSlot int
	found := false
	for _, row := range schedule.Rows {
		if row.EventID == f.EventID && row.Color != nil {
			wantFamily, wantSlot, found = row.Color.Family, row.Color.Slot, true
		}
	}
	if !found {
		t.Fatalf("the schedule carries no colour for the seeded event, nothing to compare against")
	}

	for _, item := range myEvents(member, t, "") {
		if item.ID != f.EventID {
			continue
		}
		if item.Color == nil {
			t.Fatalf("my events drops the colour the schedule shows for the same event: "+
				"the colour mark on every row reads as unassigned (schedule says %s/%d)",
				wantFamily, wantSlot)
		}
		if item.Color.Family != wantFamily || item.Color.Slot != wantSlot {
			t.Fatalf("my events reports colour %s/%d while the schedule reports %s/%d",
				item.Color.Family, item.Color.Slot, wantFamily, wantSlot)
		}
		return
	}
	t.Fatalf("the seeded event is missing from my events")
}

func TestEventCardShowsTheColourAndCoverTheAdministratorSet(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	adminView := f.AdminClient.Get("/admin/events/" + f.EventID)
	support.RequireStatus(t, adminView, http.StatusOK, "reading the event as the administrator")
	var administrative struct {
		Color *struct {
			Family string `json:"family"`
			Slot   int    `json:"slot"`
		} `json:"color"`
	}
	adminView.Decode(t, &administrative)
	if administrative.Color == nil {
		t.Fatalf("the administrator sees no colour on the seeded event, nothing to compare against")
	}

	member := s.Session(t, f.Member)
	cardResp := member.Get("/events/" + f.EventID)
	support.RequireStatus(t, cardResp, http.StatusOK, "reading the own event card")
	var card struct {
		Event struct {
			Color *struct {
				Family string `json:"family"`
				Slot   int    `json:"slot"`
			} `json:"color"`
		} `json:"event"`
	}
	cardResp.Decode(t, &card)

	if card.Event.Color == nil {
		t.Fatalf("the event card drops the colour the administrator assigned (%s/%d): the "+
			"participant sees an unassigned colour mark on the card, the overlay and the schedule strip",
			administrative.Color.Family, administrative.Color.Slot)
	}
	if card.Event.Color.Family != administrative.Color.Family ||
		card.Event.Color.Slot != administrative.Color.Slot {
		t.Fatalf("the card reports colour %s/%d while the administrator assigned %s/%d",
			card.Event.Color.Family, card.Event.Color.Slot,
			administrative.Color.Family, administrative.Color.Slot)
	}
}
