package auth

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func ptr(value string) *string { return &value }

func TestProfilePatchRejectsExecutableSchemesInEveryLinkField(t *testing.T) {
	hostile := []string{
		"javascript:alert(document.cookie)",
		"JavaScript:alert(1)",
		"data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
		"vbscript:msgbox(1)",
		"file:///etc/passwd",
	}
	fields := map[string]func(string) models.UpdateProfileRequest{
		"avatar_url": func(v string) models.UpdateProfileRequest { return models.UpdateProfileRequest{AvatarURL: ptr(v)} },
	}

	for field, build := range fields {
		for _, value := range hostile {
			t.Run(field+" "+value, func(t *testing.T) {
				if _, err := validation.ProfilePatch(build(value)); err == nil {
					t.Fatalf("%s accepted %q; such an address reaches an anchor href", field, value)
				}
			})
		}
	}
}

func TestProfilePatchAcceptsOrdinaryAddresses(t *testing.T) {
	patch, err := validation.ProfilePatch(models.UpdateProfileRequest{
		AvatarURL: ptr("https://example.org/a.png"),
	})
	if err != nil {
		t.Fatalf("expected the addresses to be accepted, got %v", err)
	}
	if patch.AvatarURL == nil || *patch.AvatarURL != "https://example.org/a.png" {
		t.Fatalf("avatar_url is %v, want the submitted address", patch.AvatarURL)
	}
	if patch.ClearAvatarURL {
		t.Fatalf("a non-empty address must not be read as a clear request")
	}
}

func TestProfilePatchTreatsAnEmptyStringAsClearing(t *testing.T) {
	patch, err := validation.ProfilePatch(models.UpdateProfileRequest{
		AvatarURL: ptr(""),
		Bio:       ptr(""),
	})
	if err != nil {
		t.Fatalf("expected an empty value to clear the field, got %v", err)
	}
	if !patch.ClearAvatarURL || !patch.ClearBio {
		t.Fatalf("an empty value did not request clearing: %+v", patch)
	}
	if patch.AvatarURL != nil || patch.Bio != nil {
		t.Fatalf("a clear request must not also carry a value: %+v", patch)
	}
}

func TestProfilePatchLeavesUnmentionedFieldsAlone(t *testing.T) {
	patch, err := validation.ProfilePatch(models.UpdateProfileRequest{FirstName: ptr("Ivan")})
	if err != nil {
		t.Fatalf("expected the request to be accepted, got %v", err)
	}
	if patch.AvatarURL != nil || patch.Bio != nil {
		t.Fatalf("an absent field was given a value: %+v", patch)
	}
	if patch.ClearAvatarURL || patch.ClearBio {
		t.Fatalf("an absent field was cleared: %+v", patch)
	}
}

func TestProfilePatchBoundsTheBioLength(t *testing.T) {
	if _, err := validation.ProfilePatch(models.UpdateProfileRequest{
		Bio: ptr(strings.Repeat("a", 2001)),
	}); err == nil {
		t.Fatalf("a bio over 2000 characters was accepted")
	}
	patch, err := validation.ProfilePatch(models.UpdateProfileRequest{
		Bio: ptr(strings.Repeat("a", 2000)),
	})
	if err != nil {
		t.Fatalf("a bio of exactly 2000 characters was rejected: %v", err)
	}
	if patch.Bio == nil {
		t.Fatalf("the accepted bio was not carried into the patch")
	}
}

func TestProfilePatchKeepsBioTextVerbatim(t *testing.T) {
	raw := "  I write <script>alert(1)</script> & \"quotes\"  "
	patch, err := validation.ProfilePatch(models.UpdateProfileRequest{Bio: ptr(raw)})
	if err != nil {
		t.Fatalf("expected the bio to be accepted, got %v", err)
	}
	if patch.Bio == nil {
		t.Fatalf("the bio was not carried into the patch")
	}
	want := strings.TrimSpace(raw)
	if *patch.Bio != want {
		t.Fatalf("the bio was rewritten to %q; escaping belongs to the renderer, "+
			"storing pre-escaped text would double-escape it", *patch.Bio)
	}
}

func TestProfileLinkURLRejectsExecutableSchemes(t *testing.T) {
	hostile := []string{
		"javascript:alert(document.cookie)",
		"JavaScript:alert(1)",
		"javascript://github.com/%0aalert(1)",
		"data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
		"data://github.com/x",
		"vbscript:msgbox(1)",
		"file:///etc/passwd",
		"ftp://example.org/x",
		"mailto:someone@example.org",
	}
	for _, value := range hostile {
		if _, err := validation.ProfileLinkURL("url", value); err == nil {
			t.Fatalf("ProfileLinkURL accepted %q; such an address reaches an anchor href", value)
		}
	}
}

func TestProfileLinkURLAcceptsBrowserSchemes(t *testing.T) {
	for _, value := range []string{"https://github.com/ivan", "http://ivan.example.org/page"} {
		got, err := validation.ProfileLinkURL("url", value)
		if err != nil {
			t.Fatalf("ProfileLinkURL rejected %q: %v", value, err)
		}
		if got != value {
			t.Fatalf("ProfileLinkURL returned %q, want %q", got, value)
		}
	}
}

func TestProfileLinkURLRejectsEmptyAndOverlongValues(t *testing.T) {
	if _, err := validation.ProfileLinkURL("url", "   "); err == nil {
		t.Fatal("a blank address was accepted")
	}
	if _, err := validation.ProfileLinkURL("url", "https://example.org/"+strings.Repeat("a", 2048)); err == nil {
		t.Fatal("an address longer than 2048 characters was accepted")
	}
}

func TestProfileLinkLabelTreatsBlankAsAbsent(t *testing.T) {
	for _, value := range []string{"", "   "} {
		label, err := validation.ProfileLinkLabel(&value)
		if err != nil {
			t.Fatalf("a blank label failed validation: %v", err)
		}
		if label != nil {
			t.Fatalf("a blank label became %v, want nil", *label)
		}
	}
	if label, err := validation.ProfileLinkLabel(nil); err != nil || label != nil {
		t.Fatalf("an absent label became %v (%v)", label, err)
	}
}

func TestProfileLinkPatchClearsTheLabelOnlyWhenAsked(t *testing.T) {
	patch, err := validation.ProfileLinkPatch(models.UpdateProfileLinkRequest{ClearLabel: true})
	if err != nil {
		t.Fatalf("clearing the label failed: %v", err)
	}
	if !patch.LabelSet || patch.Label != nil {
		t.Fatalf("clear_label did not produce an empty label: %+v", patch)
	}

	patch, err = validation.ProfileLinkPatch(models.UpdateProfileLinkRequest{URL: ptr("https://github.com/ivan")})
	if err != nil {
		t.Fatalf("updating only the address failed: %v", err)
	}
	if patch.LabelSet {
		t.Fatalf("an untouched label was marked for change: %+v", patch)
	}
}

func TestProfileLinkPatchRejectsAHostileURL(t *testing.T) {
	if _, err := validation.ProfileLinkPatch(models.UpdateProfileLinkRequest{
		URL: ptr("javascript:alert(1)"),
	}); err == nil {
		t.Fatal("ProfileLinkPatch accepted an executable scheme")
	}
}
