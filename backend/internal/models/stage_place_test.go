package models

import "testing"

func ptr[T any](v T) *T { return &v }

func onlineEvent() *Event {
	return &Event{Format: FormatOnline}
}

func offlineEvent() *Event {
	return &Event{Format: FormatOffline, CountryCode: ptr("RU"), City: ptr("Moscow")}
}

func TestResolvePlaceInheritsFromEvent(t *testing.T) {
	event := offlineEvent()
	stage := Stage{Name: "Selection"}

	place := stage.ResolvePlace(event)

	if !place.Inherited {
		t.Fatal("a stage without its own format must be marked as inherited")
	}
	if place.Format != FormatOffline {
		t.Fatalf("format = %s, want OFFLINE", place.Format)
	}
	if place.City == nil || *place.City != "Moscow" {
		t.Fatalf("city = %v, want Moscow", place.City)
	}
	if place.CountryCode == nil || *place.CountryCode != "RU" {
		t.Fatalf("country = %v, want RU", place.CountryCode)
	}
}

func TestResolvePlaceOwnFormatOverridesEvent(t *testing.T) {
	event := onlineEvent()
	stage := Stage{Name: "Final", Format: ptr(FormatOffline), CountryCode: ptr("RU"), City: ptr("Kazan")}

	place := stage.ResolvePlace(event)

	if place.Inherited {
		t.Fatal("a stage with its own format must not be marked as inherited")
	}
	if place.Format != FormatOffline {
		t.Fatalf("format = %s, want OFFLINE", place.Format)
	}
	if place.City == nil || *place.City != "Kazan" {
		t.Fatalf("city = %v, want Kazan", place.City)
	}
}

func TestResolvePlaceOnlineStageDropsEventCity(t *testing.T) {
	event := offlineEvent()
	stage := Stage{Name: "Call for applications", Format: ptr(FormatOnline)}

	place := stage.ResolvePlace(event)

	if place.Format != FormatOnline {
		t.Fatalf("format = %s, want ONLINE", place.Format)
	}
	if place.City != nil {
		t.Fatalf("city = %v, want nil: an online stage has no city", place.City)
	}
}

func TestResolvePlaceOfflineStageFallsBackToEventCity(t *testing.T) {
	event := offlineEvent()
	stage := Stage{Name: "Final", Format: ptr(FormatOffline)}

	place := stage.ResolvePlace(event)

	if place.City == nil || *place.City != "Moscow" {
		t.Fatalf("city = %v, want Moscow inherited from the event", place.City)
	}
	if place.CountryCode == nil || *place.CountryCode != "RU" {
		t.Fatalf("country = %v, want RU inherited from the event", place.CountryCode)
	}
}

func TestResolvePlaceKeepsStageVenueAndOnlineURL(t *testing.T) {
	event := offlineEvent()
	stage := Stage{Name: "Final", Venue: ptr("IT Park"), OnlineURL: ptr("https://example.com/stream")}

	place := stage.ResolvePlace(event)

	if place.Venue == nil || *place.Venue != "IT Park" {
		t.Fatalf("venue = %v, want IT Park: venue is never inherited", place.Venue)
	}
	if place.OnlineURL == nil || *place.OnlineURL != "https://example.com/stream" {
		t.Fatalf("online_url = %v, want the stage value", place.OnlineURL)
	}
}

func TestDeriveEventFormatOnlineEventWithOfflineFinal(t *testing.T) {
	event := onlineEvent()
	stages := []Stage{
		{Name: "Selection", Format: ptr(FormatOnline)},
		{Name: "Final", Format: ptr(FormatOffline), CountryCode: ptr("RU"), City: ptr("Kazan")},
	}

	if got := DeriveEventFormat(event, stages); got != FormatHybrid {
		t.Fatalf("derived format = %s, want HYBRID: the final is in Kazan", got)
	}
	if event.Format != FormatOnline {
		t.Fatal("the declared format of the event must stay untouched")
	}
}

func TestDeriveEventFormatWithoutStagesKeepsDeclared(t *testing.T) {
	if got := DeriveEventFormat(onlineEvent(), nil); got != FormatOnline {
		t.Fatalf("derived format = %s, want ONLINE", got)
	}
	if got := DeriveEventFormat(offlineEvent(), nil); got != FormatOffline {
		t.Fatalf("derived format = %s, want OFFLINE", got)
	}
}

func TestDeriveEventFormatInheritedStagesAddNothing(t *testing.T) {
	event := onlineEvent()
	stages := []Stage{{Name: "Selection"}, {Name: "Final"}}

	if got := DeriveEventFormat(event, stages); got != FormatOnline {
		t.Fatalf("derived format = %s, want ONLINE: inherited stages carry no new evidence", got)
	}
}

func TestDeriveEventFormatAllStagesOfflineOnOnlineEvent(t *testing.T) {
	event := onlineEvent()
	stages := []Stage{
		{Name: "Final", Format: ptr(FormatOffline), CountryCode: ptr("RU")},
	}

	if got := DeriveEventFormat(event, stages); got != FormatHybrid {
		t.Fatalf("derived format = %s, want HYBRID: the event itself is still declared online", got)
	}
}

func TestDeriveEventFormatHybridStageMakesEventHybrid(t *testing.T) {
	event := onlineEvent()
	stages := []Stage{{Name: "Final", Format: ptr(FormatHybrid), CountryCode: ptr("RU")}}

	if got := DeriveEventFormat(event, stages); got != FormatHybrid {
		t.Fatalf("derived format = %s, want HYBRID", got)
	}
}

func TestOfflineStagesSelectsByResolvedPlace(t *testing.T) {
	event := onlineEvent()
	stages := []Stage{
		{Name: "Selection"},
		{Name: "Final", Format: ptr(FormatOffline), CountryCode: ptr("RU"), City: ptr("Kazan")},
	}

	offline := OfflineStages(event, stages)

	if len(offline) != 1 || offline[0].Name != "Final" {
		t.Fatalf("offline stages = %v, want only the final", offline)
	}
}

func TestOfflineStagesInheritsOfflineEvent(t *testing.T) {
	event := offlineEvent()
	stages := []Stage{{Name: "Final"}}

	if got := OfflineStages(event, stages); len(got) != 1 {
		t.Fatalf("offline stages = %d, want 1: the stage inherits the offline event", len(got))
	}
}
