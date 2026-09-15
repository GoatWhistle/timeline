package postgres

import "testing"

func TestLikeContainsWrapsTheSearch(t *testing.T) {
	if got := LikeContains("Cup"); got != "%cup%" {
		t.Fatalf("a plain search must match anywhere and ignore case, got %q", got)
	}
	if got := LikeContains("  Cup  "); got != "%cup%" {
		t.Fatalf("surrounding blanks must not become part of the pattern, got %q", got)
	}
}

func TestLikeContainsEscapesTheWildcards(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  string
	}{
		{"percent", "50%", `%50\%%`},
		{"underscore", "m_", `%m\_%`},
		{"backslash", `a\b`, `%a\\b%`},
		{"only wildcards", "%_", `%\%\_%`},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := LikeContains(tc.input); got != tc.want {
				t.Fatalf("%s: got %q, wanted %q; an unescaped wildcard makes the search match everything",
					tc.name, got, tc.want)
			}
		})
	}
}
