//go:build integration

package apitest_test

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func registerWithNickname(t *testing.T, s *support.Stack, email, nickname string) support.Response {
	t.Helper()
	c := s.Client(t)
	return c.Post("/auth/register", map[string]string{
		"first_name": "Nick",
		"last_name":  "Holder",
		"email":      email,
		"nickname":   nickname,
		"password":   support.Password,
	})
}

func deleteUser(t *testing.T, s *support.Stack, admin *support.Client, id string) {
	t.Helper()
	support.RequireStatus(t, admin.Delete("/admin/users/"+id), http.StatusOK, "deleting the user")
}

func releaseReservation(t *testing.T, s *support.Stack, nickname string) {
	t.Helper()
	if _, err := s.DB().Pool().Exec(context.Background(),
		`UPDATE nickname_reservations SET released_at = now() - interval '1 minute'
		 WHERE lower(nickname) = lower($1)`, nickname); err != nil {
		t.Fatalf("expiring the reservation for %s: %v", nickname, err)
	}
}

func reservationCount(t *testing.T, s *support.Stack, nickname string) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM nickname_reservations WHERE lower(nickname) = lower($1)`,
		nickname).Scan(&count); err != nil {
		t.Fatalf("counting reservations for %s: %v", nickname, err)
	}
	return count
}

func TestDeletingAnAccountHoldsItsNicknameAndThenReleasesIt(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	nickname := support.Nickname()
	created := registerWithNickname(t, s, "hold-"+nickname+"@example.com", nickname)
	support.RequireStatus(t, created, http.StatusOK, "registering the account that will be deleted")

	var body struct {
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	created.Decode(t, &body)

	deleteUser(t, s, f.AdminClient, body.User.ID)

	if got := reservationCount(t, s, nickname); got != 1 {
		t.Fatalf("deleting the account left %d reservations for %q, want 1", got, nickname)
	}

	blocked := registerWithNickname(t, s, "taker-"+nickname+"@example.com", nickname)
	if blocked.Status != http.StatusConflict {
		t.Fatalf("a held nickname was handed out: status %d, want %d", blocked.Status, http.StatusConflict)
	}
	if code := blocked.ErrorCode(t); code != "nickname_held" {
		t.Fatalf("claiming a held nickname answered %q, want nickname_held", code)
	}

	releaseReservation(t, s, nickname)

	freed := registerWithNickname(t, s, "later-"+nickname+"@example.com", nickname)
	support.RequireStatus(t, freed, http.StatusOK,
		"claiming the nickname once the hold has expired")
}

func TestDeletedAccountDoesNotKeepItsNicknameTaken(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	nickname := support.Nickname()
	created := registerWithNickname(t, s, "free-"+nickname+"@example.com", nickname)
	support.RequireStatus(t, created, http.StatusOK, "registering the account that will be deleted")

	var body struct {
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	created.Decode(t, &body)

	deleteUser(t, s, f.AdminClient, body.User.ID)
	releaseReservation(t, s, nickname)

	claimed := registerWithNickname(t, s, "claimer-"+nickname+"@example.com", nickname)
	if claimed.Status != http.StatusOK {
		t.Fatalf("a released nickname stayed taken: status %d body %s", claimed.Status, claimed.Body)
	}
}

func requireMissingNickname(t *testing.T, resp support.Response, what string) {
	t.Helper()
	if resp.Status != http.StatusBadRequest {
		t.Fatalf("%s answered %d, want %d", what, resp.Status, http.StatusBadRequest)
	}
	var body struct {
		Error struct {
			Code   string `json:"code"`
			Fields []struct {
				Field   string `json:"field"`
				Message string `json:"message"`
			} `json:"fields"`
		} `json:"error"`
	}
	resp.Decode(t, &body)
	if body.Error.Code != "validation_failed" {
		t.Fatalf("%s answered code %q, want validation_failed", what, body.Error.Code)
	}
	for _, item := range body.Error.Fields {
		if item.Field == "nickname" && item.Message == "a nickname is required" {
			return
		}
	}
	t.Fatalf("%s did not name the missing nickname: %s", what, resp.Body)
}

func TestRegistrationWithoutANicknameIsRefusedByTheServer(t *testing.T) {
	s := support.NewStack(t)

	requireMissingNickname(t, s.Client(t).Post("/auth/register", map[string]string{
		"first_name": "No",
		"last_name":  "Nickname",
		"email":      "no-nickname-" + support.Nickname() + "@example.com",
		"password":   support.Password,
	}), "registration with no nickname at all")

	requireMissingNickname(t, s.Client(t).Post("/auth/register", map[string]string{
		"first_name": "Blank",
		"last_name":  "Nickname",
		"email":      "blank-nickname-" + support.Nickname() + "@example.com",
		"nickname":   "   ",
		"password":   support.Password,
	}), "registration with a blank nickname")
}

func TestAcceptingAnInviteWithoutANicknameIsRefused(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	email := "invitee-" + support.Nickname() + "@example.com"
	invited := f.AdminClient.Post("/admin/invites", map[string]string{"email": email})
	support.RequireStatus(t, invited, http.StatusCreated, "creating the invite")

	var invite struct {
		AcceptLink string `json:"accept_link"`
	}
	invited.Decode(t, &invite)
	parts := strings.Split(invite.AcceptLink, "/")
	token := parts[len(parts)-1]

	requireMissingNickname(t, s.Client(t).Post("/invites/accept", map[string]string{
		"token":      token,
		"first_name": "No",
		"last_name":  "Nickname",
		"password":   support.Password,
	}), "accepting an invite with no nickname")
}

func TestTwoRegistrationsRacingForOneNicknameLeaveExactlyOneWinner(t *testing.T) {
	s := support.NewStack(t)

	nickname := support.Nickname()
	const racers = 6

	var (
		wg        sync.WaitGroup
		mu        sync.Mutex
		created   int
		conflicts int
		other     []int
	)
	wg.Add(racers)
	for i := range racers {
		go func(n int) {
			defer wg.Done()
			resp := registerWithNickname(t, s,
				"racer-"+string(rune('a'+n))+"-"+nickname+"@example.com", nickname)
			mu.Lock()
			defer mu.Unlock()
			switch resp.Status {
			case http.StatusOK:
				created++
			case http.StatusConflict:
				conflicts++
				var body struct {
					Error struct {
						Code string `json:"code"`
					} `json:"error"`
				}
				if err := json.Unmarshal(resp.Body, &body); err == nil &&
					body.Error.Code != "nickname_taken" {
					t.Errorf("a losing racer answered %q, want nickname_taken", body.Error.Code)
				}
			default:
				other = append(other, resp.Status)
			}
		}(i)
	}
	wg.Wait()

	if created != 1 {
		t.Fatalf("%d racers took the same nickname, want exactly 1", created)
	}
	if conflicts != racers-1 {
		t.Fatalf("%d racers were refused with a conflict, want %d (other statuses: %v)",
			conflicts, racers-1, other)
	}
}
