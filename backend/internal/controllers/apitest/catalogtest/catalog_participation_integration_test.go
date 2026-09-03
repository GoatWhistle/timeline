//go:build integration

package catalogtest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestCatalogParticipationFilterSplitsTheListing(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	every := catalogTitles(support.Catalog(t, member, "page_size=100"))
	if _, ok := every["Member event"]; !ok {
		t.Fatalf("the unfiltered catalog lost the joined event: %v", every)
	}
	if _, ok := every["Foreign event"]; !ok {
		t.Fatalf("the unfiltered catalog lost the event the member never joined: %v", every)
	}

	mine := catalogTitles(support.Catalog(t, member, "joined=true&page_size=100"))
	if _, ok := mine["Member event"]; !ok {
		t.Fatalf("joined=true dropped the event the member takes part in: %v", mine)
	}
	if _, ok := mine["Foreign event"]; ok {
		t.Fatalf("joined=true returned an event the member never joined: %v", mine)
	}

	rest := catalogTitles(support.Catalog(t, member, "joined=false&page_size=100"))
	if _, ok := rest["Foreign event"]; !ok {
		t.Fatalf("joined=false dropped the event the member never joined: %v", rest)
	}
	if _, ok := rest["Member event"]; ok {
		t.Fatalf("joined=false returned an event the member takes part in: %v", rest)
	}
}

func TestCatalogRejectsANonBooleanParticipationFilter(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	resp := s.Session(t, f.Member).Get("/catalog?joined=maybe")
	support.RequireStatus(t, resp, http.StatusBadRequest, "a non-boolean participation filter")
}

func TestCatalogCarriesTheRegistrationTheParticipantSelfReports(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	byTitle := catalogTitles(support.Catalog(t, member, "page_size=100"))

	joined, ok := byTitle["Member event"]
	if !ok {
		t.Fatalf("the catalog lost the joined event: %v", byTitle)
	}
	if joined.TeamRole == nil || *joined.TeamRole != "Developer" {
		t.Fatalf("the catalog dropped the team role: %v", joined.TeamRole)
	}
	if joined.RegistrationURL == nil || *joined.RegistrationURL != "https://example.com/register" {
		t.Fatalf("the catalog dropped the registration link: %v", joined.RegistrationURL)
	}
	if joined.RegistrationDeadline == nil {
		t.Fatal("the catalog dropped the registration deadline")
	}
	if joined.RegistrationStatus == nil {
		t.Fatal("the catalog dropped the self-reported registration status")
	}
	if joined.RegistrationStatus.Status != "TODO" {
		t.Fatalf("the fresh status should be TODO, got %s", joined.RegistrationStatus.Status)
	}

	foreign, ok := byTitle["Foreign event"]
	if !ok {
		t.Fatalf("the catalog lost the event the member never joined: %v", byTitle)
	}
	if foreign.RegistrationStatus != nil || foreign.TeamRole != nil {
		t.Fatalf("an event the member never joined carried a status: %v", foreign)
	}
}

func TestCatalogKeepsTheRegistrationOfOneParticipantOutOfAnothersView(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	byTitle := catalogTitles(support.Catalog(t, s.Session(t, f.Outsider), "page_size=100"))
	seen, ok := byTitle["Member event"]
	if !ok {
		t.Fatalf("the catalog hid a published event from the outsider: %v", byTitle)
	}
	if seen.Joined {
		t.Fatal("the outsider was reported as a participant")
	}
	if seen.RegistrationStatus != nil || seen.TeamRole != nil {
		t.Fatalf("the outsider read another participant's registration: %v", seen)
	}
}
