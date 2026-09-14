//go:build geoipdb

package geoip

import (
	"os"
	"testing"
)

func databasePath(t *testing.T) string {
	t.Helper()
	path := os.Getenv("GEOIP_DATABASE_PATH")
	if path == "" {
		t.Skip("GEOIP_DATABASE_PATH is empty")
	}
	if _, err := os.Stat(path); err != nil {
		t.Skipf("the geoip database is not readable at %q: %v", path, err)
	}
	return path
}

func TestTheShippedDatabaseLocatesAPublicAddress(t *testing.T) {
	locator := New(databasePath(t))
	place := locator.Locate("8.8.8.8")
	if place.Empty() {
		t.Fatal("8.8.8.8 located nothing, want a place from the shipped database")
	}
	if place.CountryCode != "US" {
		t.Errorf("8.8.8.8 located country %q, want \"US\"", place.CountryCode)
	}
	t.Logf("8.8.8.8 located country=%q city=%q", place.CountryCode, place.City)
}

func TestTheShippedDatabaseLocatesACityForAnAddressThatHasOne(t *testing.T) {
	locator := New(databasePath(t))
	place := locator.Locate("2606:4700:4700::1111")
	if place.CountryCode == "" {
		t.Fatalf("2606:4700:4700::1111 located no country, got %+v", place)
	}
	t.Logf("2606:4700:4700::1111 located country=%q city=%q", place.CountryCode, place.City)
}

func TestTheShippedDatabaseIsNeverAskedAboutAPrivateAddress(t *testing.T) {
	real := New(databasePath(t))
	opened, ok := real.(*mmdbLocator)
	if !ok {
		t.Fatalf("the shipped database produced %T, want a reader-backed locator", real)
	}

	closed := &mmdbLocator{db: nil}
	for _, value := range []string{
		"10.0.0.7", "172.22.0.5", "192.168.1.1", "127.0.0.1", "::1",
		"100.64.0.1", "169.254.1.1", "198.18.0.1", "fd00::1", "0.0.0.0",
	} {
		if place := opened.Locate(value); !place.Empty() {
			t.Errorf("%s located %+v against the real database, want nothing", value, place)
		}
		if place := closed.Locate(value); !place.Empty() {
			t.Errorf("%s located %+v without a reader, want nothing", value, place)
		}
	}
}
