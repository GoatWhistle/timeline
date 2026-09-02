package models

import "testing"

func coverPtr(value string) *string { return &value }

func TestEffectiveCoverPrefersTheUploadedOne(t *testing.T) {
	event := Event{
		CoverManualURL: coverPtr("/api/v1/covers/manual.png"),
		CoverAutoURL:   coverPtr("/api/v1/covers/auto.png"),
	}
	url := event.EffectiveCoverURL()
	if url == nil || *url != "/api/v1/covers/manual.png" {
		t.Fatalf("effective cover = %v, want the uploaded one", url)
	}
	source := event.EffectiveCoverSource()
	if source == nil || *source != CoverSourceManual {
		t.Fatalf("effective source = %v, want MANUAL", source)
	}
}

func TestEffectiveCoverFallsBackToTheFetchedOne(t *testing.T) {
	event := Event{CoverAutoURL: coverPtr("/api/v1/covers/auto.png")}
	url := event.EffectiveCoverURL()
	if url == nil || *url != "/api/v1/covers/auto.png" {
		t.Fatalf("effective cover = %v, want the fetched one", url)
	}
	source := event.EffectiveCoverSource()
	if source == nil || *source != CoverSourceAuto {
		t.Fatalf("effective source = %v, want AUTO", source)
	}
}

func TestEffectiveCoverIsAbsentWithoutAnyCover(t *testing.T) {
	var event Event
	if url := event.EffectiveCoverURL(); url != nil {
		t.Fatalf("effective cover = %v, want nil", *url)
	}
	if source := event.EffectiveCoverSource(); source != nil {
		t.Fatalf("effective source = %v, want nil", *source)
	}
}

func TestCoverKeysCollectBothStoredFiles(t *testing.T) {
	event := Event{
		CoverManualURL: coverPtr("/api/v1/covers/manual.png"),
		CoverAutoURL:   coverPtr("/api/v1/covers/auto.webp"),
	}
	keys := event.CoverKeys()
	if keys.Manual != "manual.png" || keys.Auto != "auto.webp" {
		t.Fatalf("cover keys = %+v, want both files", keys)
	}
}

func TestCoverKeyFromURLIgnoresForeignValues(t *testing.T) {
	cases := []*string{
		nil,
		coverPtr(""),
		coverPtr("https://example.com/cover.png"),
		coverPtr("/api/v1/avatars/abc.png"),
		coverPtr("/api/v1/covers"),
	}
	for _, value := range cases {
		if key := CoverKeyFromURL(value); key != "" {
			label := "<nil>"
			if value != nil {
				label = *value
			}
			t.Fatalf("CoverKeyFromURL(%q) = %q, want an empty key", label, key)
		}
	}
}

func TestCoverURLRoundTrip(t *testing.T) {
	url := CoverURL("abc123.webp")
	if url != "/api/v1/covers/abc123.webp" {
		t.Fatalf("CoverURL = %q", url)
	}
	if key := CoverKeyFromURL(&url); key != "abc123.webp" {
		t.Fatalf("CoverKeyFromURL = %q, want abc123.webp", key)
	}
}
