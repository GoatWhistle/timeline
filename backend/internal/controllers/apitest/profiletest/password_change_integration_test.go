//go:build integration

package profiletest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestChangePasswordRequiresTheCurrentOne(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	resp := member.Post("/auth/password/change", map[string]string{
		"current_password": "definitely-wrong",
		"new_password":     "brand-new-horse-battery",
	})
	if resp.Status != http.StatusUnauthorized {
		t.Fatalf("changing the password with the wrong current one: expected 401, got %d body %s",
			resp.Status, resp.Body)
	}
}

func TestChangePasswordSignsInWithTheNewPasswordAfterwards(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	resp := member.Post("/auth/password/change", map[string]string{
		"current_password": support.Password,
		"new_password":     "brand-new-horse-battery",
	})
	support.RequireStatus(t, resp, http.StatusOK, "changing the password")

	fresh := s.Client(t)
	loginResp := fresh.Post("/auth/login", map[string]string{
		"email":    f.Member.Email,
		"password": "brand-new-horse-battery",
	})
	support.RequireStatus(t, loginResp, http.StatusOK, "signing in with the new password")

	oldResp := s.Client(t).Post("/auth/login", map[string]string{
		"email":    f.Member.Email,
		"password": support.Password,
	})
	if oldResp.Status != http.StatusUnauthorized {
		t.Fatalf("the old password must stop working, got %d body %s", oldResp.Status, oldResp.Body)
	}
}

func TestChangePasswordRevokesOtherSessionsButKeepsThisOne(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	deviceA := s.Session(t, f.Member)
	_ = s.Session(t, f.Member)

	resp := deviceA.Post("/auth/password/change", map[string]string{
		"current_password": support.Password,
		"new_password":     "brand-new-horse-battery",
	})
	support.RequireStatus(t, resp, http.StatusOK, "changing the password from device A")

	stillIn := deviceA.Get("/me")
	support.RequireStatus(t, stillIn, http.StatusOK, "device A must stay signed in")

	listResp := deviceA.Get("/me/sessions")
	support.RequireStatus(t, listResp, http.StatusOK, "listing sessions after the change")
	var body struct {
		Items []struct {
			Current bool `json:"current"`
		} `json:"items"`
	}
	listResp.Decode(t, &body)
	if len(body.Items) != 1 {
		t.Fatalf("expected exactly the current session to remain active, got %d: %s",
			len(body.Items), listResp.Body)
	}
	if !body.Items[0].Current {
		t.Fatalf("the one remaining session must be the current one: %s", listResp.Body)
	}
}
