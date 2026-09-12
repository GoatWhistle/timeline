package auth

import (
	"testing"
)

func TestEmailChangeCancelRevertsWhenTheAttackerAlreadyConfirmedTheSwap(t *testing.T) {
	if !emailChangeCancelReverts("attacker@evil.example", "owner@example.com") {
		t.Fatalf("cancelling must revert the account when the change already went through; " +
			"otherwise a hijacked session locks the real owner out permanently")
	}
}

func TestEmailChangeCancelIsANoOpWhenNothingWasEverApplied(t *testing.T) {
	if emailChangeCancelReverts("owner@example.com", "owner@example.com") {
		t.Fatalf("cancelling before confirmation must not write an identical email back, " +
			"or every cancellation would forge a spurious audit entry")
	}
}

func TestEmailChangeCancelComparesNormalizedAddresses(t *testing.T) {
	if emailChangeCancelReverts("owner@example.com", "  Owner@Example.COM  ") {
		t.Fatalf("the origin email must be compared normalized (trimmed, lowercased) against the " +
			"current one, or a case/whitespace difference alone would trigger a needless revert")
	}
}
