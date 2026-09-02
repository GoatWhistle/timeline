package imagefetch

import (
	"errors"
	"net"
	"testing"
)

func TestAllowedIPRejectsInternalDestinations(t *testing.T) {
	blocked := map[string]string{
		"IPv4 loopback":           "127.0.0.1",
		"IPv4 loopback range":     "127.9.9.9",
		"unspecified":             "0.0.0.0",
		"private 10/8":            "10.1.2.3",
		"private 172.16/12":       "172.16.5.5",
		"private 172.31/12":       "172.31.255.254",
		"private 192.168/16":      "192.168.1.1",
		"cloud metadata":          "169.254.169.254",
		"link local":              "169.254.1.1",
		"carrier grade nat":       "100.64.0.1",
		"benchmarking":            "198.18.0.1",
		"documentation TEST-NET":  "192.0.2.1",
		"documentation TEST-NET3": "203.0.113.9",
		"multicast":               "224.0.0.1",
		"reserved":                "240.0.0.1",
		"broadcast":               "255.255.255.255",
		"IPv6 loopback":           "::1",
		"IPv6 unspecified":        "::",
		"IPv6 unique local":       "fd00::1",
		"IPv6 link local":         "fe80::1",
		"IPv6 multicast":          "ff02::1",
		"IPv4 mapped loopback":    "::ffff:127.0.0.1",
		"IPv4 mapped private":     "::ffff:10.0.0.1",
		"IPv4 mapped metadata":    "::ffff:169.254.169.254",
	}
	for name, literal := range blocked {
		t.Run(name, func(t *testing.T) {
			ip := net.ParseIP(literal)
			if ip == nil {
				t.Fatalf("unparsable literal %q", literal)
			}
			if AllowedIP(ip) {
				t.Fatalf("AllowedIP(%s) = true, want false", literal)
			}
		})
	}
}

func TestAllowedIPAcceptsPublicDestinations(t *testing.T) {
	for _, literal := range []string{"1.1.1.1", "8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"} {
		if !AllowedIP(net.ParseIP(literal)) {
			t.Fatalf("AllowedIP(%s) = false, want true", literal)
		}
	}
}

func TestCheckURLRejectsLiteralInternalAddresses(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want error
	}{
		{"loopback literal", "http://127.0.0.1/cover.png", ErrBlockedDestination},
		{"metadata literal", "http://169.254.169.254/latest/meta-data/", ErrBlockedDestination},
		{"private literal", "https://10.0.0.5/a.png", ErrBlockedDestination},
		{"ipv6 loopback literal", "http://[::1]:8080/a.png", ErrBlockedDestination},
		{"loopback literal with port", "http://127.0.0.1:8080/a.png", ErrBlockedDestination},
		{"localhost name", "http://localhost:5432/", ErrBlockedHost},
		{"localhost subdomain", "http://api.localhost/", ErrBlockedHost},
		{"mdns name", "http://printer.local/", ErrBlockedHost},
		{"internal suffix", "http://db.internal/", ErrBlockedHost},
		{"bare hostname", "http://postgres/", ErrBlockedHost},
		{"file scheme", "file:///etc/passwd", ErrBlockedScheme},
		{"gopher scheme", "gopher://example.com/", ErrBlockedScheme},
		{"data scheme", "data:image/png;base64,AAAA", ErrBlockedScheme},
		{"empty host", "http:///cover.png", ErrBlockedHost},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := CheckURL(tc.raw); !errors.Is(err, tc.want) {
				t.Fatalf("CheckURL(%q) = %v, want %v", tc.raw, err, tc.want)
			}
		})
	}
}

func TestCheckURLAcceptsPublicAddresses(t *testing.T) {
	for _, raw := range []string{
		"https://example.com/cover.png",
		"http://example.com:8080/cover.png",
		"https://8.8.8.8/cover.png",
	} {
		if _, err := CheckURL(raw); err != nil {
			t.Fatalf("CheckURL(%q) = %v, want nil", raw, err)
		}
	}
}

func TestCheckResolvedRejectsAnyInternalAnswer(t *testing.T) {
	addrs := []net.IPAddr{
		{IP: net.ParseIP("93.184.216.34")},
		{IP: net.ParseIP("127.0.0.1")},
	}
	if err := checkResolved("mixed.example.com", addrs); !errors.Is(err, ErrBlockedDestination) {
		t.Fatalf("checkResolved with one internal answer = %v, want ErrBlockedDestination", err)
	}
}

func TestCheckResolvedRejectsEmptyAnswer(t *testing.T) {
	if err := checkResolved("nowhere.example.com", nil); !errors.Is(err, ErrUnresolvable) {
		t.Fatalf("checkResolved with no answer = %v, want ErrUnresolvable", err)
	}
}

func TestCheckResolvedAcceptsPublicAnswers(t *testing.T) {
	addrs := []net.IPAddr{{IP: net.ParseIP("93.184.216.34")}, {IP: net.ParseIP("1.1.1.1")}}
	if err := checkResolved("example.com", addrs); err != nil {
		t.Fatalf("checkResolved with public answers = %v, want nil", err)
	}
}
