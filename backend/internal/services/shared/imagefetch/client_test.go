package imagefetch

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type staticResolver struct {
	answers map[string][]net.IPAddr
	calls   int
}

func (r *staticResolver) LookupIPAddr(_ context.Context, host string) ([]net.IPAddr, error) {
	r.calls++
	if addrs, ok := r.answers[host]; ok {
		return addrs, nil
	}
	if ip := net.ParseIP(host); ip != nil {
		return []net.IPAddr{{IP: ip}}, nil
	}
	return nil, &net.DNSError{Err: "no such host", Name: host, IsNotFound: true}
}

type rebindResolver struct {
	answers []net.IPAddr
	calls   int
}

func (r *rebindResolver) LookupIPAddr(_ context.Context, _ string) ([]net.IPAddr, error) {
	index := r.calls
	r.calls++
	if index >= len(r.answers) {
		index = len(r.answers) - 1
	}
	return []net.IPAddr{r.answers[index]}, nil
}

func testPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	img.Set(0, 0, color.RGBA{R: 1, G: 2, B: 3, A: 255})
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

func serverHost(t *testing.T, server *httptest.Server) (string, string) {
	t.Helper()
	address := strings.TrimPrefix(server.URL, "http://")
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		t.Fatalf("split %q: %v", address, err)
	}
	return host, port
}

func originOnlyPolicy(origin string) func(net.IP) bool {
	allowed := net.ParseIP(origin)
	return func(ip net.IP) bool {
		if allowed != nil && ip.Equal(allowed) {
			return true
		}
		return AllowedIP(ip)
	}
}

func clientFor(t *testing.T, server *httptest.Server, opts Options) (*Client, string) {
	t.Helper()
	host, port := serverHost(t, server)
	if opts.policy == nil {
		opts.policy = originOnlyPolicy(host)
	}
	if opts.Resolver == nil {
		opts.Resolver = &staticResolver{answers: map[string][]net.IPAddr{
			"cover.example.com": {{IP: net.ParseIP(host)}},
		}}
	}
	return New(opts), "http://cover.example.com:" + port
}

func TestFetchImageRejectsRedirectToPrivateAddress(t *testing.T) {
	redirector := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://10.0.0.7/secret.png", http.StatusFound)
	}))
	defer redirector.Close()

	client, base := clientFor(t, redirector, Options{MaxRedirects: 5})
	_, err := client.FetchImage(context.Background(), base+"/cover.png")
	if !errors.Is(err, ErrBlockedDestination) {
		t.Fatalf("redirect to a private address = %v, want ErrBlockedDestination", err)
	}
}

func TestFetchImageRejectsRedirectToCloudMetadata(t *testing.T) {
	redirector := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://169.254.169.254/latest/meta-data/", http.StatusFound)
	}))
	defer redirector.Close()

	client, base := clientFor(t, redirector, Options{MaxRedirects: 5})
	_, err := client.FetchImage(context.Background(), base+"/cover.png")
	if !errors.Is(err, ErrBlockedDestination) {
		t.Fatalf("redirect to cloud metadata = %v, want ErrBlockedDestination", err)
	}
}

func TestFetchImageRejectsRedirectToLocalhostName(t *testing.T) {
	redirector := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://localhost:9/secret.png", http.StatusFound)
	}))
	defer redirector.Close()

	client, base := clientFor(t, redirector, Options{MaxRedirects: 5})
	_, err := client.FetchImage(context.Background(), base+"/cover.png")
	if !errors.Is(err, ErrBlockedHost) {
		t.Fatalf("redirect to localhost name = %v, want ErrBlockedHost", err)
	}
}

func TestFetchImageRejectsRedirectAwayFromHTTP(t *testing.T) {
	redirector := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "file:///etc/passwd", http.StatusFound)
	}))
	defer redirector.Close()

	client, base := clientFor(t, redirector, Options{MaxRedirects: 5})
	_, err := client.FetchImage(context.Background(), base+"/cover.png")
	if !errors.Is(err, ErrBlockedScheme) {
		t.Fatalf("redirect to a file url = %v, want ErrBlockedScheme", err)
	}
}

func TestFetchImageCapsRedirects(t *testing.T) {
	var server *httptest.Server
	hops := 0
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hops++
		http.Redirect(w, r, server.URL+"/next", http.StatusFound)
	}))
	defer server.Close()

	host, port := serverHost(t, server)
	client := New(Options{
		MaxRedirects: 2,
		policy:       originOnlyPolicy(host),
		Resolver: &staticResolver{answers: map[string][]net.IPAddr{
			"cover.example.com": {{IP: net.ParseIP(host)}},
		}},
	})
	_, err := client.FetchImage(context.Background(), "http://cover.example.com:"+port+"/cover.png")
	if !errors.Is(err, ErrTooManyRedirects) {
		t.Fatalf("redirect loop = %v, want ErrTooManyRedirects", err)
	}
	if hops > 4 {
		t.Fatalf("followed %d hops, the cap did not stop the loop", hops)
	}
}

func TestFetchImageRejectsDNSRebinding(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.Write(testPNG(t, 4, 4))
	}))
	defer server.Close()

	_, port := serverHost(t, server)
	resolver := &rebindResolver{answers: []net.IPAddr{
		{IP: net.ParseIP("127.0.0.1")},
	}}
	client := New(Options{Timeout: 3 * time.Second, Resolver: resolver})

	target := "http://rebind.example.com:" + port + "/a.png"
	if _, err := CheckURL(target); err != nil {
		t.Fatalf("the public-looking name should pass the first check: %v", err)
	}
	if _, err := client.FetchImage(context.Background(), target); !errors.Is(err, ErrBlockedDestination) {
		t.Fatalf("rebound answer = %v, want ErrBlockedDestination", err)
	}
	if resolver.calls == 0 {
		t.Fatal("the dialer never resolved the host, so nothing was re-checked")
	}
}

type passthroughResolver struct{ ip net.IP }

func (r *passthroughResolver) LookupIPAddr(_ context.Context, _ string) ([]net.IPAddr, error) {
	return []net.IPAddr{{IP: r.ip}}, nil
}

func TestDialControlBlocksAnAddressTheResolverStepApproved(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		w.Write(testPNG(t, 4, 4))
	}))
	defer server.Close()

	host, port := serverHost(t, server)
	permissive := func(net.IP) bool { return true }
	client := New(Options{
		Timeout:  3 * time.Second,
		Resolver: &passthroughResolver{ip: net.ParseIP(host)},
		policy:   permissive,
	})
	if _, err := client.FetchImage(context.Background(),
		"http://approved.example.com:"+port+"/a.png"); err != nil {
		t.Fatalf("a permissive policy should reach the server: %v", err)
	}

	strict := New(Options{
		Timeout:  3 * time.Second,
		Resolver: &passthroughResolver{ip: net.ParseIP(host)},
		policy:   AllowedIP,
	})
	if _, err := strict.FetchImage(context.Background(),
		"http://approved.example.com:"+port+"/a.png"); !errors.Is(err, ErrBlockedDestination) {
		t.Fatalf("the real policy should refuse the loopback answer, got %v", err)
	}
}
