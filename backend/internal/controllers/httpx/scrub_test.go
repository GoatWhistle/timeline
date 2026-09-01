package httpx

import (
	"strings"
	"testing"
)

const scrubSecret = "9Qk3TmVvV3JkT2ZUaGVEYXlJc0hlcmVOb3c"

func TestScrubPathRemovesTheCalendarToken(t *testing.T) {
	cases := []struct {
		name string
		path string
		want string
	}{
		{
			"the mounted feed route",
			"/api/v1/calendar/" + scrubSecret + "/feed.ics",
			"/api/v1/calendar/[redacted]/feed.ics",
		},
		{
			"a future API version",
			"/api/v2/calendar/" + scrubSecret + "/feed.ics",
			"/api/v2/calendar/[redacted]/feed.ics",
		},
		{
			"no trailing segment",
			"/api/v1/calendar/" + scrubSecret,
			"/api/v1/calendar/[redacted]",
		},
		{
			"a trailing slash leaves nothing to redact",
			"/api/v1/calendar/",
			"/api/v1/calendar/",
		},
		{
			"the bare segment",
			"/api/v1/calendar",
			"/api/v1/calendar",
		},
		{
			"an unrelated path is untouched",
			"/api/v1/me/schedule",
			"/api/v1/me/schedule",
		},
		{
			"the management route carries no secret and keeps its shape",
			"/api/v1/me/calendar-feed",
			"/api/v1/me/calendar-feed",
		},
		{
			"a token that itself contains the segment name",
			"/api/v1/calendar/calendar/feed.ics",
			"/api/v1/calendar/[redacted]/feed.ics",
		},
		{
			"the team join link",
			"/api/v1/team-join/" + scrubSecret,
			"/api/v1/team-join/[redacted]",
		},
		{
			"the team listing carries no secret",
			"/api/v1/teams",
			"/api/v1/teams",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ScrubPath(tc.path)
			if got != tc.want {
				t.Fatalf("ScrubPath(%q) = %q, expected %q", tc.path, got, tc.want)
			}
			if strings.Contains(got, scrubSecret) {
				t.Fatalf("ScrubPath(%q) left the secret in place: %q", tc.path, got)
			}
		})
	}
}
