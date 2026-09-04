package httpx

import (
	"strings"
	"testing"
)

const scrubSecret = "9Qk3TmVvV3JkT2ZUaGVEYXlJc0hlcmVOb3c"

func TestScrubPathRemovesTheTeamJoinToken(t *testing.T) {
	cases := []struct {
		name string
		path string
		want string
	}{
		{
			"the mounted join route",
			"/api/v1/team-join/" + scrubSecret,
			"/api/v1/team-join/[redacted]",
		},
		{
			"a future API version",
			"/api/v2/team-join/" + scrubSecret,
			"/api/v2/team-join/[redacted]",
		},
		{
			"a trailing segment after the token",
			"/api/v1/team-join/" + scrubSecret + "/accept",
			"/api/v1/team-join/[redacted]/accept",
		},
		{
			"a trailing slash leaves nothing to redact",
			"/api/v1/team-join/",
			"/api/v1/team-join/",
		},
		{
			"the bare segment",
			"/api/v1/team-join",
			"/api/v1/team-join",
		},
		{
			"an unrelated path is untouched",
			"/api/v1/me/schedule",
			"/api/v1/me/schedule",
		},
		{
			"the team listing carries no secret",
			"/api/v1/teams",
			"/api/v1/teams",
		},
		{
			"a token that itself contains the segment name",
			"/api/v1/team-join/team-join",
			"/api/v1/team-join/[redacted]",
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
