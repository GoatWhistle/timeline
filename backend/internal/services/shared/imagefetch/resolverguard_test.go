package imagefetch

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type recordingPolicy struct {
	strict func(net.IP) bool
	dialed []net.IP
}

func (p *recordingPolicy) allow(ip net.IP) bool {
	p.dialed = append(p.dialed, ip)
	return p.strict(ip)
}

func TestTheResolverStageRefusesWithoutHelpFromTheDialControl(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(testPNG(t, 4, 4))
	}))
	defer server.Close()

	host, port := serverHost(t, server)
	policy := &recordingPolicy{strict: AllowedIP}
	client := New(Options{
		Timeout:  3 * time.Second,
		Resolver: &passthroughResolver{ip: net.ParseIP(host)},
		policy:   policy.allow,
	})

	dial := client.dialGuarded(&net.Dialer{Timeout: time.Second, KeepAlive: -1})
	conn, err := dial(context.Background(), "tcp", "rebound.example.com:"+port)
	if conn != nil {
		_ = conn.Close()
	}
	if !errors.Is(err, ErrBlockedDestination) {
		t.Fatalf("the guarded dial must refuse a host resolving to loopback, got %v", err)
	}

	for _, ip := range policy.dialed {
		if ip.Equal(net.ParseIP(host)) {
			return
		}
	}
	t.Fatalf("the resolved address %s was never examined before dialling: "+
		"nothing re-checked what DNS answered", host)
}

func TestTheResolverStageRefusesEveryAnswerNotOnlyTheFirst(t *testing.T) {
	public := net.ParseIP("93.184.216.34")
	internal := net.ParseIP("169.254.169.254")

	err := checkResolvedWith("mixed.example.com",
		[]net.IPAddr{{IP: public}, {IP: internal}}, AllowedIP)
	if !errors.Is(err, ErrBlockedDestination) {
		t.Fatalf("a name answering with one public and one internal address must be refused, got %v", err)
	}
}
