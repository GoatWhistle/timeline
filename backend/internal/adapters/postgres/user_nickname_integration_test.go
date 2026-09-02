//go:build integration

package postgres_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestNicknameOnASoftDeletedRowIsNotTaken(t *testing.T) {
	db := testsupport.DB(t)
	users := identity.NewUsers(db)
	ctx := context.Background()

	nickname := "gone" + uuid.NewString()[:8]
	created, err := users.Create(ctx, &models.User{
		FirstName:    "Soft",
		LastName:     "Deleted",
		Nickname:     &nickname,
		Email:        "soft-deleted-" + nickname + "@example.test",
		PasswordHash: "hash",
		IsActive:     true,
	})
	if err != nil {
		t.Fatalf("creating the user that will be deleted: %v", err)
	}

	if _, err := db.Pool().Exec(ctx,
		`UPDATE users SET deleted_at = now() WHERE id = $1`, created.ID); err != nil {
		t.Fatalf("soft deleting the user: %v", err)
	}

	taken, err := users.NicknameTaken(ctx, nickname, uuid.Nil)
	if err != nil {
		t.Fatalf("asking whether the nickname is taken: %v", err)
	}
	if taken {
		t.Fatalf("the nickname of a soft deleted account is still reported as taken")
	}

	found, err := users.GetByNickname(ctx, nickname)
	if err == nil {
		t.Fatalf("a soft deleted account was still found by nickname: %v", found.ID)
	}
}

func TestNicknameOnALiveRowStaysTaken(t *testing.T) {
	db := testsupport.DB(t)
	users := identity.NewUsers(db)
	ctx := context.Background()

	nickname := "live" + uuid.NewString()[:8]
	if _, err := users.Create(ctx, &models.User{
		FirstName:    "Still",
		LastName:     "Here",
		Nickname:     &nickname,
		Email:        "live-" + nickname + "@example.test",
		PasswordHash: "hash",
		IsActive:     true,
	}); err != nil {
		t.Fatalf("creating the live user: %v", err)
	}

	taken, err := users.NicknameTaken(ctx, nickname, uuid.Nil)
	if err != nil {
		t.Fatalf("asking whether the nickname is taken: %v", err)
	}
	if !taken {
		t.Fatalf("the nickname of a live account is not reported as taken")
	}
}
