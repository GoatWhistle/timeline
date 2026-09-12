package locale

import (
	"sort"
	"strings"
	"testing"
)

var allowedPrefixes = []string{"notification.", "email.", "duration.", "digest.", "inbox."}

func TestBackendCatalogHoldsOnlyWorkerRenderedText(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for _, key := range Keys(lang) {
			allowed := false
			for _, prefix := range allowedPrefixes {
				if strings.HasPrefix(key, prefix) {
					allowed = true
					break
				}
			}
			if !allowed {
				t.Errorf("%s: key %q is outside %v; on-screen text belongs in frontend/src/shared/i18n",
					lang, key, allowedPrefixes)
			}
		}
	}
}

func TestCatalogsShareKeySet(t *testing.T) {
	ru := Keys("ru")
	en := Keys("en")
	sort.Strings(ru)
	sort.Strings(en)
	if len(ru) != len(en) {
		t.Fatalf("key counts differ: ru=%d en=%d", len(ru), len(en))
	}
	for i := range ru {
		if ru[i] != en[i] {
			t.Errorf("key mismatch at %d: ru=%q en=%q", i, ru[i], en[i])
		}
	}
}

func TestMessageSubstitutesPlaceholders(t *testing.T) {
	got := Message("en", "notification.primary.subject", "title", "Demo Day")
	if !strings.Contains(got, "Demo Day") {
		t.Errorf("placeholder not substituted: %q", got)
	}
}

func TestPluralUsesRussianForms(t *testing.T) {
	cases := map[int]string{1: "1 минуту", 3: "3 минуты", 11: "11 минут"}
	for n, want := range cases {
		if got := Plural("ru", "duration.minute", n); got != want {
			t.Errorf("Plural(ru, %d) = %q, want %q", n, got, want)
		}
	}
}
