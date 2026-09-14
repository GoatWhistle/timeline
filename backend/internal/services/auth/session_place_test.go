package auth

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

type stubLocator struct {
	place models.SessionPlace
	calls int
}

func (s *stubLocator) Locate(string) models.SessionPlace {
	s.calls++
	return s.place
}

func TestLocatePlaceSkipsAnEmptyAddressWithoutAskingTheDatabase(t *testing.T) {
	stub := &stubLocator{place: models.SessionPlace{CountryCode: "NL", City: "Amsterdam"}}
	svc := &AuthService{places: stub}
	if place := svc.locatePlace(""); !place.Empty() {
		t.Fatalf("an empty address located %+v, want nothing", place)
	}
	if stub.calls != 0 {
		t.Fatalf("an empty address reached the database %d time(s), want none", stub.calls)
	}
}

func TestLocatePlaceStaysEmptyWithoutALocator(t *testing.T) {
	svc := &AuthService{}
	if place := svc.locatePlace("95.142.44.18"); !place.Empty() {
		t.Fatalf("a missing locator located %+v, want nothing", place)
	}
}

func TestPlaceColumnsLeaveAnUnknownPlaceNull(t *testing.T) {
	country, city := placeColumns(models.SessionPlace{})
	if country != nil || city != nil {
		t.Fatalf("an unknown place became (%v, %v), want both NULL", country, city)
	}
}

func TestPlaceColumnsKeepEachHalfIndependently(t *testing.T) {
	country, city := placeColumns(models.SessionPlace{CountryCode: "NL"})
	if country == nil || *country != "NL" {
		t.Fatalf("the country became %v, want \"NL\"", country)
	}
	if city != nil {
		t.Fatalf("a missing city became %q, want NULL", *city)
	}

	country, city = placeColumns(models.SessionPlace{City: "Amsterdam"})
	if country != nil {
		t.Fatalf("a missing country became %q, want NULL", *country)
	}
	if city == nil || *city != "Amsterdam" {
		t.Fatalf("the city became %v, want \"Amsterdam\"", city)
	}
}

func TestPlaceColumnsTrimACityTheColumnWouldNotHold(t *testing.T) {
	long := ""
	for range 200 {
		long += "a"
	}
	_, city := placeColumns(models.SessionPlace{City: long})
	if city == nil {
		t.Fatal("a long city became NULL, want it trimmed")
	}
	if len(*city) != 128 {
		t.Fatalf("a long city kept %d bytes, want 128", len(*city))
	}
}
