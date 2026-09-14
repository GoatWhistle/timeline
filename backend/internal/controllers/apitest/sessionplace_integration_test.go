//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
	"github.com/GoatWhistle/timeline/internal/models"
)

type placedSession struct {
	ID          string  `json:"id"`
	IP          *string `json:"ip"`
	CountryCode *string `json:"country_code"`
	City        *string `json:"city"`
	Current     bool    `json:"current"`
}

func placedSessions(c *support.Client, t *testing.T) []placedSession {
	t.Helper()
	resp := c.Get("/me/sessions")
	support.RequireStatus(t, resp, http.StatusOK, "listing own sessions")
	var body struct {
		Items []placedSession `json:"items"`
	}
	resp.Decode(t, &body)
	return body.Items
}

func TestSessionPlaceStaysAbsentForAnAddressWithoutOne(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	c := s.Session(t, f.Member)

	for _, item := range placedSessions(c, t) {
		if item.CountryCode != nil {
			t.Errorf("session %s carries country %q, want none for a loopback sign-in",
				item.ID, *item.CountryCode)
		}
		if item.City != nil {
			t.Errorf("session %s carries city %q, want none for a loopback sign-in",
				item.ID, *item.City)
		}
	}
}

func TestSessionPlaceIsReadBackFromTheRowAndNotRecomputed(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	c := s.Session(t, f.Member)

	before := placedSessions(c, t)
	current := ""
	for _, item := range before {
		if item.Current {
			current = item.ID
		}
	}
	if current == "" {
		t.Fatal("no session came back marked current")
	}

	ctx := context.Background()
	if _, err := s.DB().Pool().Exec(ctx,
		`UPDATE sessions SET country_code = 'NL', city = 'Amsterdam' WHERE display_id = $1`,
		current); err != nil {
		t.Fatalf("the place could not be stored on the row: %v", err)
	}

	var found bool
	for _, item := range placedSessions(c, t) {
		if item.ID != current {
			continue
		}
		found = true
		if item.CountryCode == nil || *item.CountryCode != "NL" {
			t.Fatalf("the list answered country %v, want the stored \"NL\" rather than a fresh lookup",
				item.CountryCode)
		}
		if item.City == nil || *item.City != "Amsterdam" {
			t.Fatalf("the list answered city %v, want the stored \"Amsterdam\" rather than a fresh lookup",
				item.City)
		}
	}
	if !found {
		t.Fatalf("session %s disappeared from the list", current)
	}
}

func TestSessionPlaceSurvivesARefresh(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	c := s.Session(t, f.Member)

	before := placedSessions(c, t)
	current := ""
	for _, item := range before {
		if item.Current {
			current = item.ID
		}
	}
	if current == "" {
		t.Fatal("no session came back marked current")
	}

	ctx := context.Background()
	if _, err := s.DB().Pool().Exec(ctx,
		`UPDATE sessions SET country_code = 'NL', city = 'Amsterdam' WHERE display_id = $1`,
		current); err != nil {
		t.Fatalf("the place could not be stored on the row: %v", err)
	}

	resp := c.Mutate(http.MethodPost, "/auth/refresh", nil)
	support.RequireStatus(t, resp, http.StatusOK, "rotating the refresh token")

	items := placedSessions(c, t)
	var rotated *placedSession
	for i := range items {
		if items[i].Current {
			rotated = &items[i]
		}
	}
	if rotated == nil {
		t.Fatal("no session came back marked current after the refresh")
	}
	if rotated.CountryCode == nil || *rotated.CountryCode != "NL" {
		t.Fatalf("the rotated session carries country %v, want the place carried over as \"NL\"",
			rotated.CountryCode)
	}
	if rotated.City == nil || *rotated.City != "Amsterdam" {
		t.Fatalf("the rotated session carries city %v, want the place carried over as \"Amsterdam\"",
			rotated.City)
	}
}

type recordingLocator struct {
	place models.SessionPlace
	seen  []string
}

func (r *recordingLocator) Locate(ip string) models.SessionPlace {
	r.seen = append(r.seen, ip)
	return r.place
}

func TestSessionPlaceIsStoredWhenTheSessionIsCreated(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	locator := &recordingLocator{place: models.SessionPlace{CountryCode: "NL", City: "Amsterdam"}}
	s.Auth().WithPlaces(locator)

	c := s.Client(t)
	c.RefreshCSRF()
	resp := c.Do(http.MethodPost, "/auth/login",
		map[string]string{"email": f.Member.Email, "password": support.Password},
		map[string]string{
			"X-Forwarded-For": "95.142.44.18",
			"X-CSRF-Token":    c.Cookie(support.CSRFCookie),
		})
	support.RequireStatus(t, resp, http.StatusOK, "signing in from a located address")

	if len(locator.seen) == 0 {
		t.Fatal("signing in never asked the locator, so no place could have been stored")
	}
	if locator.seen[0] != "95.142.44.18" {
		t.Fatalf("the locator was asked about %q, want the address of the sign-in", locator.seen[0])
	}

	var country, city *string
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT country_code, city FROM sessions
		 WHERE user_id = (SELECT id FROM users WHERE email = $1)
		 ORDER BY created_at DESC LIMIT 1`, f.Member.Email).Scan(&country, &city); err != nil {
		t.Fatalf("reading the stored place back: %v", err)
	}
	if country == nil || *country != "NL" {
		t.Fatalf("the row holds country %v, want \"NL\" written when the session was created", country)
	}
	if city == nil || *city != "Amsterdam" {
		t.Fatalf("the row holds city %v, want \"Amsterdam\" written when the session was created", city)
	}
}

func TestSessionPlaceIsNotAskedForAgainWhenTheListIsRead(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	locator := &recordingLocator{place: models.SessionPlace{CountryCode: "NL", City: "Amsterdam"}}
	s.Auth().WithPlaces(locator)

	c := s.Session(t, f.Member)
	asked := len(locator.seen)

	for range 3 {
		placedSessions(c, t)
	}

	if len(locator.seen) != asked {
		t.Fatalf("reading the list asked the locator %d more time(s), want the stored value reused",
			len(locator.seen)-asked)
	}
}
