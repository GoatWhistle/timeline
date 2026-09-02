package imagefetch

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCoverCandidatesPrefersOpenGraph(t *testing.T) {
	page := `<html><head>
		<meta name="twitter:image" content="https://example.com/twitter.png">
		<meta property="og:image" content="https://example.com/og.png">
		<link rel="apple-touch-icon" href="/icon.png">
		</head><body>
		<meta property="og:image" content="https://example.com/body-injected.png">
		</body></html>`
	got := CoverCandidates(page)
	want := []string{
		"https://example.com/og.png",
		"https://example.com/twitter.png",
		"/icon.png",
	}
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("candidate %d = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestCoverCandidatesIgnoresContentInsideBody(t *testing.T) {
	page := `<html><head></head><body>
		<meta property="og:image" content="https://evil.example.com/injected.png">
		</body></html>`
	if got := CoverCandidates(page); len(got) != 0 {
		t.Fatalf("candidates from the body = %v, want none", got)
	}
}

func TestCoverCandidatesUnescapesEntities(t *testing.T) {
	page := `<head><meta property="og:image" content="https://example.com/a.png?w=1&amp;h=2"></head>`
	got := CoverCandidates(page)
	if len(got) != 1 || got[0] != "https://example.com/a.png?w=1&h=2" {
		t.Fatalf("got %v, want the unescaped url", got)
	}
}

func TestCoverCandidatesHandlesSingleQuotesAndCasing(t *testing.T) {
	page := `<HEAD><META PROPERTY='OG:IMAGE' CONTENT='https://example.com/a.png'></HEAD>`
	got := CoverCandidates(page)
	if len(got) != 1 || got[0] != "https://example.com/a.png" {
		t.Fatalf("got %v, want the single-quoted url", got)
	}
}

func coverServer(t *testing.T, page string) (*httptest.Server, *Client, string) {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(page))
	})
	mux.HandleFunc("/cover.png", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.Write(testPNG(t, 20, 10))
	})
	mux.HandleFunc("/broken.png", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte("not an image"))
	})
	server := httptest.NewServer(mux)
	client, base := clientFor(t, server, Options{MaxRedirects: 3})
	return server, client, base
}

func TestFetchCoverReadsRelativeOpenGraphImage(t *testing.T) {
	server, client, base := coverServer(t, `<html><head>
		<meta property="og:image" content="/cover.png"></head><body></body></html>`)
	defer server.Close()

	cover, err := client.FetchCover(context.Background(), base+"/")
	if err != nil {
		t.Fatalf("FetchCover = %v, want nil", err)
	}
	if cover.ContentType != "image/png" || cover.Width != 20 || cover.Height != 10 {
		t.Fatalf("got %s %dx%d, want image/png 20x10", cover.ContentType, cover.Width, cover.Height)
	}
}

func TestFetchCoverSkipsBrokenCandidateAndTakesTheNext(t *testing.T) {
	server, client, base := coverServer(t, `<html><head>
		<meta property="og:image" content="/broken.png">
		<meta name="twitter:image" content="/cover.png"></head><body></body></html>`)
	defer server.Close()

	cover, err := client.FetchCover(context.Background(), base+"/")
	if err != nil {
		t.Fatalf("FetchCover = %v, want nil", err)
	}
	if cover.Width != 20 {
		t.Fatalf("width %d, want the fallback candidate", cover.Width)
	}
}

func TestFetchCoverRejectsCandidatePointingAtInternalNetwork(t *testing.T) {
	server, client, base := coverServer(t, `<html><head>
		<meta property="og:image" content="http://169.254.169.254/latest/meta-data/"></head></html>`)
	defer server.Close()

	_, err := client.FetchCover(context.Background(), base+"/")
	if !errors.Is(err, ErrBlockedDestination) {
		t.Fatalf("internal candidate = %v, want ErrBlockedDestination", err)
	}
}

func TestFetchCoverIgnoresDataURICandidate(t *testing.T) {
	server, client, base := coverServer(t, `<html><head>
		<meta property="og:image" content="data:image/png;base64,AAAA"></head></html>`)
	defer server.Close()

	if _, err := client.FetchCover(context.Background(), base+"/"); !errors.Is(err, ErrNoCover) {
		t.Fatalf("data uri candidate = %v, want ErrNoCover", err)
	}
}

func TestFetchCoverReportsMissingCover(t *testing.T) {
	server, client, base := coverServer(t, `<html><head><title>no cover</title></head></html>`)
	defer server.Close()

	if _, err := client.FetchCover(context.Background(), base+"/"); !errors.Is(err, ErrNoCover) {
		t.Fatalf("page without og:image = %v, want ErrNoCover", err)
	}
}

func TestFetchCoverRejectsNonHTMLPage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/pdf")
		w.Write([]byte("%PDF-1.4"))
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{})
	if _, err := client.FetchCover(context.Background(), base+"/"); !errors.Is(err, ErrNoCover) {
		t.Fatalf("pdf page = %v, want ErrNoCover", err)
	}
}

func TestFetchCoverRejectsInternalWebsiteBeforeAnyRequest(t *testing.T) {
	client := New(Options{Resolver: &staticResolver{answers: map[string][]net.IPAddr{}}})
	for _, target := range []string{
		"http://127.0.0.1/",
		"http://169.254.169.254/",
		"http://localhost/",
		"file:///etc/passwd",
	} {
		if _, err := client.FetchCover(context.Background(), target); err == nil {
			t.Fatalf("FetchCover(%q) succeeded, want a guard error", target)
		}
	}
}

func TestFetchCoverStripsMetadata(t *testing.T) {
	withComment := append([]byte{}, testPNG(t, 8, 8)...)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			w.Header().Set("Content-Type", "text/html")
			w.Write([]byte(`<head><meta property="og:image" content="/c.png"></head>`))
			return
		}
		w.Header().Set("Content-Type", "image/png")
		w.Write(withComment)
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{})
	cover, err := client.FetchCover(context.Background(), base+"/")
	if err != nil {
		t.Fatalf("FetchCover = %v, want nil", err)
	}
	if len(cover.Data) > len(withComment) {
		t.Fatalf("stored %d bytes from a %d byte source, stripping grew the file",
			len(cover.Data), len(withComment))
	}
}
