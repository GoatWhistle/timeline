//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type sessionPolicy struct {
	IdleDays    *int `json:"idle_days"`
	MinDays     int  `json:"min_days"`
	MaxDays     int  `json:"max_days"`
	DefaultDays int  `json:"default_days"`
}

func readSessionPolicy(c *support.Client, t *testing.T) sessionPolicy {
	t.Helper()
	resp := c.Get("/me/session-policy")
	support.RequireStatus(t, resp, http.StatusOK, "reading the idle-session policy")
	var body sessionPolicy
	resp.Decode(t, &body)
	return body
}

func TestSessionPolicyStartsAtTheDefaultAndCarriesItsBounds(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	c := s.Session(t, f.Member)

	policy := readSessionPolicy(c, t)
	if policy.IdleDays == nil {
		t.Fatal("a fresh account never revokes idle sessions, want the default period")
	}
	if *policy.IdleDays != 180 {
		t.Fatalf("a fresh account revokes idle sessions after %d days, want 180", *policy.IdleDays)
	}
	if policy.DefaultDays != 180 {
		t.Fatalf("the server reported a default of %d days, want 180", policy.DefaultDays)
	}
	if policy.MinDays != 1 || policy.MaxDays != 365 {
		t.Fatalf("the bounds came back as %d..%d, want 1..365", policy.MinDays, policy.MaxDays)
	}
	if policy.DefaultDays < policy.MinDays || policy.DefaultDays > policy.MaxDays {
		t.Fatalf("the default of %d days falls outside the advertised range %d..%d",
			policy.DefaultDays, policy.MinDays, policy.MaxDays)
	}
}

func TestSessionPolicyStoresAndClearsTheIdlePeriod(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	c := s.Session(t, f.Member)

	days := 30
	resp := c.Mutate(http.MethodPut, "/me/session-policy", map[string]any{"idle_days": days})
	support.RequireStatus(t, resp, http.StatusOK, "storing the idle period")
	var stored sessionPolicy
	resp.Decode(t, &stored)
	if stored.IdleDays == nil || *stored.IdleDays != days {
		t.Fatalf("the stored period came back as %v, want %d", stored.IdleDays, days)
	}
	if read := readSessionPolicy(c, t); read.IdleDays == nil || *read.IdleDays != days {
		t.Fatalf("the period did not survive a re-read: %v", read.IdleDays)
	}

	cleared := c.Mutate(http.MethodPut, "/me/session-policy", map[string]any{"idle_days": nil})
	support.RequireStatus(t, cleared, http.StatusOK, "turning the sweep off")
	if read := readSessionPolicy(c, t); read.IdleDays != nil {
		t.Fatalf("turning the sweep off left %d days behind", *read.IdleDays)
	}

	restored := c.Mutate(http.MethodPut, "/me/session-policy",
		map[string]any{"idle_days": readSessionPolicy(c, t).DefaultDays})
	support.RequireStatus(t, restored, http.StatusOK, "restoring the default period")
	if read := readSessionPolicy(c, t); read.IdleDays == nil || *read.IdleDays != 180 {
		t.Fatalf("restoring the default left %v, want 180", read.IdleDays)
	}
}

func TestSessionPolicyRefusesAPeriodOutsideTheBounds(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	c := s.Session(t, f.Member)

	accepted := 30
	support.RequireStatus(t, c.Mutate(http.MethodPut, "/me/session-policy",
		map[string]any{"idle_days": accepted}), http.StatusOK, "storing a period inside the range")

	for _, days := range []int{0, -1, 366, 10000} {
		resp := c.Mutate(http.MethodPut, "/me/session-policy", map[string]any{"idle_days": days})
		support.RequireStatus(t, resp, http.StatusBadRequest, "storing a period outside the range")
		var body struct {
			Error struct {
				Fields []struct {
					Field string `json:"field"`
					Code  string `json:"code"`
				} `json:"fields"`
			} `json:"error"`
		}
		resp.Decode(t, &body)
		fields := body.Error.Fields
		if len(fields) != 1 || fields[0].Field != "idle_days" {
			t.Fatalf("%d days was refused without naming idle_days: %+v", days, fields)
		}
		if fields[0].Code != "out_of_range" {
			t.Fatalf("%d days was refused with code %q, want \"out_of_range\"", days, fields[0].Code)
		}
		if read := readSessionPolicy(c, t); read.IdleDays == nil || *read.IdleDays != accepted {
			t.Fatalf("a refused period of %d days changed the stored setting to %v", days, read.IdleDays)
		}
	}
}

func TestSessionPolicyIsPrivateToItsOwner(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)
	admin := s.Session(t, f.Admin)

	days := 14
	support.RequireStatus(t, member.Mutate(http.MethodPut, "/me/session-policy",
		map[string]any{"idle_days": days}), http.StatusOK, "storing the member's period")

	policy := readSessionPolicy(admin, t)
	if policy.IdleDays == nil || *policy.IdleDays != 180 {
		t.Fatalf("the administrator's own period became %v, want the untouched default of 180",
			policy.IdleDays)
	}

	support.RequireStatus(t, admin.Mutate(http.MethodPut, "/me/session-policy",
		map[string]any{"idle_days": nil}), http.StatusOK, "turning the administrator's sweep off")

	if read := readSessionPolicy(member, t); read.IdleDays == nil || *read.IdleDays != days {
		t.Fatalf("the member's period became %v after the administrator changed their own, want %d",
			read.IdleDays, days)
	}
}
