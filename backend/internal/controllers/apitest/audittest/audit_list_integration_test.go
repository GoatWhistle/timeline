//go:build integration

package audittest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type auditItem struct {
	ActorUserID *string   `json:"actor_user_id"`
	ActorEmail  *string   `json:"actor_email"`
	Action      string    `json:"action"`
	EntityType  string    `json:"entity_type"`
	CreatedAt   time.Time `json:"created_at"`
}

type auditPage struct {
	Items []auditItem `json:"items"`
	Meta  struct {
		Total int64 `json:"total"`
	} `json:"meta"`
}

type probe struct {
	at         time.Time
	actor      *uuid.UUID
	action     string
	entityType string
}

var probeEpoch = time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)

func insertProbes(t *testing.T, s *support.Stack, probes ...probe) {
	t.Helper()
	for _, p := range probes {
		if _, err := s.DB().Pool().Exec(context.Background(), `
			INSERT INTO audit_log (actor_user_id, action, entity_type, created_at)
			VALUES ($1, $2, $3, $4)`, p.actor, p.action, p.entityType, p.at); err != nil {
			t.Fatalf("inserting the audit probe %s: %v", p.action, err)
		}
	}
}

func readAudit(t *testing.T, c *support.Client, query string) auditPage {
	t.Helper()
	resp := c.Get("/admin/audit" + query)
	support.RequireStatus(t, resp, http.StatusOK, "reading the audit log "+query)
	var page auditPage
	resp.Decode(t, &page)
	return page
}

func actions(page auditPage) string {
	names := make([]string, 0, len(page.Items))
	for _, item := range page.Items {
		names = append(names, item.Action)
	}
	return strings.Join(names, ",")
}

func seedSortProbes(t *testing.T, s *support.Stack, f support.Fixture) {
	t.Helper()
	admin := s.UserUUID(t, f.Admin.ID)
	member := s.UserUUID(t, f.Member.ID)
	insertProbes(t, s,
		probe{probeEpoch.Add(1 * time.Second), &member, "PROBE_C", "ENTITY_B"},
		probe{probeEpoch.Add(2 * time.Second), &admin, "PROBE_A", "ENTITY_C"},
		probe{probeEpoch.Add(3 * time.Second), nil, "PROBE_B", "ENTITY_A"},
		probe{probeEpoch.Add(4 * time.Second), nil, "PROBE_D", "ENTITY_D"},
	)
}

const probeWindow = "&from=2019-12-31T00:00:00Z&to=2020-01-02T00:00:00Z"

func TestAuditListSortsByEveryFieldInBothDirections(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	seedSortProbes(t, s, f)

	cases := []struct{ query, want string }{
		{"", "PROBE_D,PROBE_B,PROBE_A,PROBE_C"},
		{"&sort=created_at&order=desc", "PROBE_D,PROBE_B,PROBE_A,PROBE_C"},
		{"&sort=created_at&order=asc", "PROBE_C,PROBE_A,PROBE_B,PROBE_D"},
		{"&sort=action&order=asc", "PROBE_A,PROBE_B,PROBE_C,PROBE_D"},
		{"&sort=action&order=desc", "PROBE_D,PROBE_C,PROBE_B,PROBE_A"},
		{"&sort=entity_type&order=asc", "PROBE_B,PROBE_C,PROBE_A,PROBE_D"},
		{"&sort=entity_type&order=desc", "PROBE_D,PROBE_A,PROBE_C,PROBE_B"},
		{"&sort=actor&order=asc", "PROBE_A,PROBE_C,PROBE_D,PROBE_B"},
		{"&sort=actor&order=desc", "PROBE_C,PROBE_A,PROBE_D,PROBE_B"},
		{"&sort=ACTION&order=ASC", "PROBE_A,PROBE_B,PROBE_C,PROBE_D"},
	}
	for _, tc := range cases {
		page := readAudit(t, f.AdminClient, "?page_size=50"+probeWindow+tc.query)
		if got := actions(page); got != tc.want {
			t.Fatalf("audit order for %q: got %s, want %s", tc.query, got, tc.want)
		}
	}
}

func TestAuditListRejectsUnknownSortAndOrder(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	for _, query := range []string{
		"?sort=email",
		"?sort=a.created_at",
		"?sort=created_at%3BDROP%20TABLE%20audit_log",
		"?order=sideways",
		"?sort=action&order=desc%3BDROP%20TABLE%20audit_log",
	} {
		support.RequireErrorCode(t, f.AdminClient.Get("/admin/audit"+query),
			http.StatusBadRequest, "validation_failed", "the audit log with "+query)
	}
	support.RequireStatus(t, f.AdminClient.Get("/admin/audit"), http.StatusOK,
		"the audit log survives the rejected sort attempts")
}

func TestAuditListSearchesEmailActionAndEntityType(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	token := strings.ToUpper(strings.ReplaceAll(uuid.NewString(), "-", "")[:10])
	member := s.UserUUID(t, f.Member.ID)
	insertProbes(t, s,
		probe{probeEpoch, nil, "ACT_" + token, "ALPHA"},
		probe{probeEpoch, nil, "BETA", "ENT_" + token},
		probe{probeEpoch, &member, "GAMMA", "DELTA"},
		probe{probeEpoch, nil, "PCT%" + token, "OMEGA"},
		probe{probeEpoch, nil, "UNRELATED", "OTHER"},
	)

	underscore := readAudit(t, f.AdminClient, "?search=ct_"+strings.ToLower(token))
	if got := actions(underscore); got != "ACT_"+token {
		t.Fatalf("an underscore in the search acted as a wildcard: got %s", got)
	}
	byToken := readAudit(t, f.AdminClient, "?search="+strings.ToLower(token)+"&sort=action&order=asc")
	if got := actions(byToken); got != "ACT_"+token+",BETA,PCT%"+token || byToken.Meta.Total != 3 {
		t.Fatalf("searching %s: got %s (total %d), want the action and entity type matches",
			token, got, byToken.Meta.Total)
	}

	local := strings.ToUpper(strings.SplitN(f.Member.Email, "@", 2)[0])
	byEmail := readAudit(t, f.AdminClient, "?search="+local)
	if byEmail.Meta.Total == 0 || !strings.Contains(actions(byEmail), "GAMMA") {
		t.Fatalf("searching the member email %s missed the member entry: %s", local, actions(byEmail))
	}
	for _, item := range byEmail.Items {
		if item.ActorEmail == nil || *item.ActorEmail != f.Member.Email {
			t.Fatalf("searching the member email returned an entry of another actor: %+v", item)
		}
	}

	byPercent := readAudit(t, f.AdminClient, "?search=%25")
	if byPercent.Meta.Total != 1 || actions(byPercent) != "PCT%"+token {
		t.Fatalf("a percent sign in the search acted as a wildcard: %s (total %d)",
			actions(byPercent), byPercent.Meta.Total)
	}
}
