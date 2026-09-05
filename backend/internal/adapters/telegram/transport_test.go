package telegram

import (
	"context"
	"errors"
	"net"
	"reflect"
	"testing"
)

func TestDirectDialFallsBackWithoutChangingOtherHosts(t *testing.T) {
	var addresses []string
	left, right := net.Pipe()
	defer left.Close()
	defer right.Close()
	dial := directDial([]string{"192.0.2.1", "192.0.2.2"}, func(_ context.Context, _, address string) (net.Conn, error) {
		addresses = append(addresses, address)
		if address == "192.0.2.1:443" {
			return nil, errors.New("unreachable")
		}
		return left, nil
	})
	if _, err := dial(context.Background(), "tcp", "api.telegram.org:443"); err != nil {
		t.Fatal(err)
	}
	if _, err := dial(context.Background(), "tcp", "example.com:443"); err != nil {
		t.Fatal(err)
	}
	want := []string{"192.0.2.1:443", "192.0.2.2:443", "example.com:443"}
	if !reflect.DeepEqual(addresses, want) {
		t.Fatalf("dialed %v, want %v", addresses, want)
	}
}

func TestDirectDialKeepsDNSAsLastResort(t *testing.T) {
	var addresses []string
	dial := directDial([]string{"192.0.2.1"}, func(_ context.Context, _, address string) (net.Conn, error) {
		addresses = append(addresses, address)
		return nil, errors.New("unreachable")
	})
	_, err := dial(context.Background(), "tcp", "api.telegram.org:443")
	if err == nil || !reflect.DeepEqual(addresses, []string{"192.0.2.1:443", "api.telegram.org:443"}) {
		t.Fatalf("lost DNS fallback: %v, %v", addresses, err)
	}
}

func TestDirectDialStopsWhenCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	calls := 0
	dial := directDial([]string{"192.0.2.1", "192.0.2.2"}, func(context.Context, string, string) (net.Conn, error) {
		calls++
		cancel()
		return nil, context.Canceled
	})
	_, err := dial(ctx, "tcp", "api.telegram.org:443")
	if !errors.Is(err, context.Canceled) || calls != 1 {
		t.Fatalf("canceled dial continued: calls=%d err=%v", calls, err)
	}
}
