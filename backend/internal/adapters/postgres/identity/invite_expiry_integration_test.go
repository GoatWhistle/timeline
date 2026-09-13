//go:build integration

package identity_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestExpiredInviteCannotBeAcceptedEvenWhenTheServiceAsks(t *testing.T) {
	db := testsupport.DB(t)
	ctx := context.Background()
	repo := identity.NewInvites(db)

	var adminID uuid.UUID
	err := db.Pool().QueryRow(ctx, `
		INSERT INTO users (email, password_hash, first_name, last_name, is_admin)
		VALUES ($1, 'x', 'Ada', 'Admin', true) RETURNING id`,
		"invite-expiry-"+uuid.NewString()+"@example.com").Scan(&adminID)
	if err != nil {
		t.Fatalf("seeding the inviting admin: %v", err)
	}

	past := time.Now().UTC().Add(-time.Hour)
	var inviteID uuid.UUID
	err = db.Pool().QueryRow(ctx, `
		INSERT INTO invites (normalized_email, created_by_user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4) RETURNING id`,
		"recruit-"+uuid.NewString()+"@example.com", adminID, uuid.NewString(), past).Scan(&inviteID)
	if err != nil {
		t.Fatalf("seeding the expired invite: %v", err)
	}

	err = repo.MarkAccepted(ctx, inviteID, time.Now().UTC())
	if err == nil {
		t.Fatal("an expired invite was accepted; the expiry must be enforced by the statement itself")
	}
	var conflict *models.DomainError
	if !errors.As(err, &conflict) {
		t.Fatalf("accepting an expired invite returned %v, want a domain conflict", err)
	}

	var accepted *time.Time
	if err := db.Pool().QueryRow(ctx,
		`SELECT accepted_at FROM invites WHERE id = $1`, inviteID).Scan(&accepted); err != nil {
		t.Fatalf("rereading the invite: %v", err)
	}
	if accepted != nil {
		t.Fatalf("the refused invite was still marked accepted at %v", *accepted)
	}
}

func TestLiveInviteIsStillAccepted(t *testing.T) {
	db := testsupport.DB(t)
	ctx := context.Background()
	repo := identity.NewInvites(db)

	var adminID uuid.UUID
	err := db.Pool().QueryRow(ctx, `
		INSERT INTO users (email, password_hash, first_name, last_name, is_admin)
		VALUES ($1, 'x', 'Ada', 'Admin', true) RETURNING id`,
		"invite-live-"+uuid.NewString()+"@example.com").Scan(&adminID)
	if err != nil {
		t.Fatalf("seeding the inviting admin: %v", err)
	}

	var inviteID uuid.UUID
	err = db.Pool().QueryRow(ctx, `
		INSERT INTO invites (normalized_email, created_by_user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4) RETURNING id`,
		"recruit-"+uuid.NewString()+"@example.com", adminID, uuid.NewString(),
		time.Now().UTC().Add(72*time.Hour)).Scan(&inviteID)
	if err != nil {
		t.Fatalf("seeding the live invite: %v", err)
	}

	if err := repo.MarkAccepted(ctx, inviteID, time.Now().UTC()); err != nil {
		t.Fatalf("a live invite must still be acceptable: %v", err)
	}
}
