//go:build integration

package services_test

import (
	"context"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/services"
)

func TestEmptyWeeklyDigestIsNotSent(t *testing.T) {
	d := newDigestStack(t)
	ctx := context.Background()

	owner := d.user(t, "Europe/Moscow")
	notifyBefore := d.count(t, "notifications")

	result, err := d.svc.Run(ctx)
	if err != nil {
		t.Fatalf("running the digest pass: %v", err)
	}
	if result.Sent != 0 {
		t.Fatalf("an empty week produced %d digests, todo item 139 forbids any", result.Sent)
	}
	if result.Skipped == 0 {
		t.Fatalf("the recipient with nothing this week was not counted as skipped")
	}
	if got := len(d.digests(t, owner)); got != 0 {
		t.Fatalf("an empty week stored %d digest rows, want 0", got)
	}
	if after := d.count(t, "notifications"); after != notifyBefore {
		t.Fatalf("the digest queued %d notifications, it belongs on the bus instead",
			after-notifyBefore)
	}
}

func TestWeeklyDigestIsSentWhenTheWeekHasSomething(t *testing.T) {
	d := newDigestStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := d.user(t, "Europe/Moscow")
	eventID := d.event(t, now.Add(-24*time.Hour), now.Add(30*24*time.Hour))
	d.task(t, owner, eventID, thisWeek(t, "Europe/Moscow"))

	result, err := d.svc.Run(ctx)
	if err != nil {
		t.Fatalf("running the digest pass: %v", err)
	}
	if result.Sent != 1 {
		t.Fatalf("a week with one task produced %d digests, want 1", result.Sent)
	}

	stored := d.digests(t, owner)
	if len(stored) != 1 {
		t.Fatalf("stored %d digest rows, want 1", len(stored))
	}
	if total, _ := stored[0]["total"].(float64); total != 1 {
		t.Fatalf("the digest reports total=%v, want 1", stored[0]["total"])
	}
	if zone, _ := stored[0]["timezone"].(string); zone != "Europe/Moscow" {
		t.Fatalf("the digest was rendered in %q, want the recipient zone Europe/Moscow", zone)
	}
}

func TestWeeklyDigestIsEmittedOncePerWeek(t *testing.T) {
	d := newDigestStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := d.user(t, "Europe/Moscow")
	eventID := d.event(t, now.Add(-24*time.Hour), now.Add(30*24*time.Hour))
	d.task(t, owner, eventID, thisWeek(t, "Europe/Moscow"))

	for i := 0; i < 3; i++ {
		if _, err := d.svc.Run(ctx); err != nil {
			t.Fatalf("digest pass %d: %v", i, err)
		}
	}
	if got := len(d.digests(t, owner)); got != 1 {
		t.Fatalf("three passes over one week produced %d digests, want 1", got)
	}
}

func TestWeeklyDigestRendersInTheRecipientLanguageAndZone(t *testing.T) {
	d := newDigestStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := d.user(t, "Asia/Tokyo")
	if _, err := d.db.Pool().Exec(ctx,
		`UPDATE users SET locale = 'en' WHERE id = $1`, owner); err != nil {
		t.Fatalf("setting the recipient language: %v", err)
	}
	eventID := d.event(t, now.Add(-24*time.Hour), now.Add(30*24*time.Hour))
	d.task(t, owner, eventID, thisWeek(t, "Asia/Tokyo"))

	if _, err := d.svc.Run(ctx); err != nil {
		t.Fatalf("running the digest pass: %v", err)
	}

	stored := d.digests(t, owner)
	if len(stored) != 1 {
		t.Fatalf("stored %d digest rows, want 1", len(stored))
	}
	if lang, _ := stored[0]["language"].(string); lang != "en" {
		t.Fatalf("the digest was rendered in %q, want the recipient language en", lang)
	}
	if zone, _ := stored[0]["timezone"].(string); zone != "Asia/Tokyo" {
		t.Fatalf("the digest was rendered in %q, want the recipient zone Asia/Tokyo", zone)
	}
	subject, _ := stored[0]["subject"].(string)
	if subject != "What is on this week in Timeline" {
		t.Fatalf("the subject %q is not the English template", subject)
	}
}

func TestWeekBoundsFollowTheRecipientZone(t *testing.T) {
	moscow, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		t.Fatalf("loading Europe/Moscow: %v", err)
	}
	pacific, err := time.LoadLocation("Pacific/Auckland")
	if err != nil {
		t.Fatalf("loading Pacific/Auckland: %v", err)
	}

	instant := time.Date(2026, 3, 1, 12, 0, 0, 0, time.UTC)
	moscowStart, moscowEnd := services.WeekBounds(instant, moscow)
	pacificStart, _ := services.WeekBounds(instant, pacific)

	if moscowStart.Equal(pacificStart) {
		t.Fatalf("both zones start the week at %s; the instant is Sunday in Moscow "+
			"and already Monday in Auckland, so the bounds must differ", moscowStart)
	}
	if !pacificStart.After(moscowStart) {
		t.Fatalf("Auckland is a week ahead here, so its week start %s must follow "+
			"the Moscow one %s", pacificStart, moscowStart)
	}
	if !moscowEnd.After(instant) || !moscowStart.Before(instant) {
		t.Fatalf("the Moscow week %s..%s does not contain the instant %s",
			moscowStart, moscowEnd, instant)
	}
	if moscowEnd.Sub(moscowStart) != 7*24*time.Hour {
		t.Fatalf("the week spans %s, want exactly 7 days", moscowEnd.Sub(moscowStart))
	}
}

func TestWeeklyDigestSkipsDeactivatedRecipients(t *testing.T) {
	d := newDigestStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := d.user(t, "Europe/Moscow")
	eventID := d.event(t, now.Add(-24*time.Hour), now.Add(30*24*time.Hour))
	d.task(t, owner, eventID, thisWeek(t, "Europe/Moscow"))
	if _, err := d.db.Pool().Exec(ctx,
		`UPDATE users SET is_active = false WHERE id = $1`, owner); err != nil {
		t.Fatalf("deactivating the recipient: %v", err)
	}

	result, err := d.svc.Run(ctx)
	if err != nil {
		t.Fatalf("running the digest pass: %v", err)
	}
	if result.Sent != 0 {
		t.Fatalf("a deactivated recipient received %d digests, want 0", result.Sent)
	}
	if got := len(d.digests(t, owner)); got != 0 {
		t.Fatalf("a deactivated recipient has %d digest rows, want 0", got)
	}
}
