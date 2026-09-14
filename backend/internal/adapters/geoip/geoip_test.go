package geoip

import (
	"net/netip"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestRoutableRejectsAddressesTheDatabaseCannotHold(t *testing.T) {
	unroutable := []string{
		"10.0.0.7", "172.16.0.1", "172.22.0.5", "172.31.255.254",
		"192.168.1.1", "127.0.0.1", "::1", "fd00::1", "169.254.1.1",
		"0.0.0.0", "100.64.0.1", "198.18.0.1", "::ffff:192.168.1.1",
	}
	for _, value := range unroutable {
		addr, err := netip.ParseAddr(value)
		if err != nil {
			t.Fatalf("%q did not parse: %v", value, err)
		}
		if Routable(addr) {
			t.Errorf("%q was treated as routable, want it skipped before the lookup", value)
		}
	}
}

func TestRoutableAcceptsPublicAddresses(t *testing.T) {
	for _, value := range []string{"95.142.44.18", "8.8.8.8", "2606:4700:4700::1111", "203.0.113.7"} {
		addr, err := netip.ParseAddr(value)
		if err != nil {
			t.Fatalf("%q did not parse: %v", value, err)
		}
		if !Routable(addr) {
			t.Errorf("%q was treated as unroutable, want it looked up", value)
		}
	}
}

func TestAnAbsentDatabaseLocatesNothingAndDoesNotPanic(t *testing.T) {
	for _, path := range []string{"", "/nonexistent/geoip-city.mmdb"} {
		locator := New(path)
		if locator == nil {
			t.Fatalf("New(%q) returned no locator", path)
		}
		if place := locator.Locate("95.142.44.18"); !place.Empty() {
			t.Errorf("New(%q) located %+v, want nothing", path, place)
		}
	}
}

func TestLocateOnAPrivateAddressStaysEmpty(t *testing.T) {
	locator := &mmdbLocator{db: nil}
	if place := locator.Locate("172.22.0.5"); !place.Empty() {
		t.Fatalf("a private address located %+v, want nothing", place)
	}
	if place := locator.Locate("not an address"); !place.Empty() {
		t.Fatalf("an unparsable address located %+v, want nothing", place)
	}
}

func TestCountryCodeKeepsOnlyTwoUppercaseLetters(t *testing.T) {
	if got := countryCode("NL"); got != "NL" {
		t.Errorf("countryCode(\"NL\") = %q, want \"NL\"", got)
	}
	for _, value := range []string{"", "n", "nl", "NLD", "N1", "N-"} {
		if got := countryCode(value); got != "" {
			t.Errorf("countryCode(%q) = %q, want the column constraint to be respected", value, got)
		}
	}
}

func TestSessionPlaceIsEmptyOnlyWithoutBothParts(t *testing.T) {
	if !(models.SessionPlace{}).Empty() {
		t.Error("a blank place is not empty")
	}
	if (models.SessionPlace{CountryCode: "NL"}).Empty() {
		t.Error("a place with only a country is reported empty")
	}
	if (models.SessionPlace{City: "Amsterdam"}).Empty() {
		t.Error("a place with only a city is reported empty")
	}
}
