package imagefetch

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestFetchImageCapsBodySize(t *testing.T) {
	big := bytes.Repeat([]byte{0}, 64<<10)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.Write(big)
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{MaxBytes: 1 << 10})
	if _, err := client.FetchImage(context.Background(), base+"/big.png"); !errors.Is(err, ErrTooLarge) {
		t.Fatalf("oversized body = %v, want ErrTooLarge", err)
	}
}

func TestFetchImageCapsEndlessStream(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.WriteHeader(http.StatusOK)
		flusher, _ := w.(http.Flusher)
		chunk := bytes.Repeat([]byte{0}, 4096)
		for {
			select {
			case <-r.Context().Done():
				return
			default:
			}
			if _, err := w.Write(chunk); err != nil {
				return
			}
			if flusher != nil {
				flusher.Flush()
			}
		}
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{MaxBytes: 32 << 10, Timeout: 5 * time.Second})
	done := make(chan error, 1)
	go func() {
		_, err := client.FetchImage(context.Background(), base+"/endless.png")
		done <- err
	}()
	select {
	case err := <-done:
		if !errors.Is(err, ErrTooLarge) {
			t.Fatalf("endless stream = %v, want ErrTooLarge", err)
		}
	case <-time.After(20 * time.Second):
		t.Fatal("the endless stream was never cut off")
	}
}

func TestFetchImageCapsTotalTime(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-time.After(30 * time.Second):
		case <-r.Context().Done():
		}
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{Timeout: time.Second})
	start := time.Now()
	if _, err := client.FetchImage(context.Background(), base+"/slow.png"); err == nil {
		t.Fatal("a hanging server produced no error")
	}
	if elapsed := time.Since(start); elapsed > 10*time.Second {
		t.Fatalf("the request ran for %s, the timeout did not apply", elapsed)
	}
}

func TestFetchImageRejectsWrongContentType(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write(testPNG(t, 4, 4))
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{})
	if _, err := client.FetchImage(context.Background(), base+"/a.png"); !errors.Is(err, ErrNotAnImage) {
		t.Fatalf("html content type = %v, want ErrNotAnImage", err)
	}
}

func TestFetchImageRejectsUndecodableBodyDespiteImageContentType(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.Write([]byte("<html>this is not a png at all</html>"))
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{})
	if _, err := client.FetchImage(context.Background(), base+"/a.png"); !errors.Is(err, ErrNotAnImage) {
		t.Fatalf("undecodable body = %v, want ErrNotAnImage", err)
	}
}

func TestFetchImageRejectsSVGDeclaredAsImage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/svg+xml")
		w.Write([]byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`))
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{})
	if _, err := client.FetchImage(context.Background(), base+"/a.svg"); !errors.Is(err, ErrNotAnImage) {
		t.Fatalf("svg = %v, want ErrNotAnImage", err)
	}
}

func TestFetchImageAcceptsRealImage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.Write(testPNG(t, 12, 9))
	}))
	defer server.Close()

	client, base := clientFor(t, server, Options{})
	cover, err := client.FetchImage(context.Background(), base+"/a.png")
	if err != nil {
		t.Fatalf("FetchImage = %v, want nil", err)
	}
	if cover.ContentType != "image/png" || cover.Width != 12 || cover.Height != 9 {
		t.Fatalf("got %s %dx%d, want image/png 12x9", cover.ContentType, cover.Width, cover.Height)
	}
}
