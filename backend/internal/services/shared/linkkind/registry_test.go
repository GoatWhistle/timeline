package linkkind

import "testing"

func TestDetectFromURL(t *testing.T) {
	cases := []struct {
		url  string
		want string
	}{
		{"https://github.com/ivan", "github"},
		{"https://www.github.com/ivan", "github"},
		{"https://gist.github.com/ivan", "github"},
		{"https://t.me/ivan", "telegram"},
		{"https://x.com/ivan", "x"},
		{"https://example.org/ivan", Website},
	}
	for _, c := range cases {
		got := DetectFromURL(c.url)
		if got != c.want {
			t.Errorf("DetectFromURL(%q) = %q, want %q", c.url, got, c.want)
		}
	}
}
