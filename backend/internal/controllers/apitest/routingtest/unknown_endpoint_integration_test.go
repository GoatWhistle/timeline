//go:build integration

package routingtest_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestUnknownAPIPathAnswersWithTheErrorEnvelope(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	for _, path := range []string{"/s", "/nonexistent", "/events/ev_gma9hq8a96q5/not-a-thing"} {
		resp := f.AdminClient.Get(path)
		support.RequireStatus(t, resp, http.StatusNotFound, "an unknown endpoint "+path)

		body := string(resp.Body)
		if strings.Contains(body, "404 page not found") {
			t.Fatalf("%s fell through to the router default instead of the API envelope: %s", path, body)
		}

		var envelope struct {
			Error struct {
				Code      string `json:"code"`
				Message   string `json:"message"`
				RequestID string `json:"request_id"`
			} `json:"error"`
		}
		if err := json.Unmarshal(resp.Body, &envelope); err != nil {
			t.Fatalf("%s did not answer with JSON: %v (%s)", path, err, body)
		}
		if envelope.Error.Code != "not_found" {
			t.Errorf("%s reported the code %q, want not_found", path, envelope.Error.Code)
		}
		if envelope.Error.RequestID == "" {
			t.Errorf("%s carries no request_id, so the line cannot be traced in the log", path)
		}
	}
}

func TestKnownEndpointsAreNotSwallowedByTheFallback(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, f.AdminClient.Get("/me"), http.StatusOK,
		"a real endpoint still answers past the unknown-path fallback")
}
