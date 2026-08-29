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
		"avatar_url":  func(v string) models.UpdateProfileRequest { return models.UpdateProfileRequest{AvatarURL: ptr(v)} },
		"github_url":  func(v string) models.UpdateProfileRequest { return models.UpdateProfileRequest{GithubURL: ptr(v)} },
		"website_url": func(v string) models.UpdateProfileRequest { return models.UpdateProfileRequest{WebsiteURL: ptr(v)} },
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
		AvatarURL:  ptr("https://example.org/a.png"),
		GithubURL:  ptr("https://github.com/ivan"),
		WebsiteURL: ptr("http://ivan.example.org"),
	})
	if err != nil {
		t.Fatalf("expected the addresses to be accepted, got %v", err)
	}
	if patch.AvatarURL == nil || *patch.AvatarURL != "https://example.org/a.png" {
		t.Fatalf("avatar_url is %v, want the submitted address", patch.AvatarURL)
	}
	if patch.WebsiteURL == nil || *patch.WebsiteURL != "http://ivan.example.org" {
		t.Fatalf("a plain http address was not accepted: %v", patch.WebsiteURL)
	}
	if patch.ClearAvatarURL || patch.ClearGithubURL || patch.ClearWebsiteURL {
		t.Fatalf("a non-empty address must not be read as a clear request")
	}
}

func TestProfilePatchTreatsAnEmptyStringAsClearing(t *testing.T) {
	patch, err := validation.ProfilePatch(models.UpdateProfileRequest{
		AvatarURL:  ptr(""),
		GithubURL:  ptr("   "),
		WebsiteURL: ptr(""),
		Bio:        ptr(""),
	})
	if err != nil {
		t.Fatalf("expected an empty value to clear the field, got %v", err)
	}
	if !patch.ClearAvatarURL || !patch.ClearGithubURL || !patch.ClearWebsiteURL || !patch.ClearBio {
		t.Fatalf("an empty value did not request clearing: %+v", patch)
	}
	if patch.AvatarURL != nil || patch.GithubURL != nil || patch.WebsiteURL != nil || patch.Bio != nil {
		t.Fatalf("a clear request must not also carry a value: %+v", patch)
	}
}

func TestProfilePatchLeavesUnmentionedFieldsAlone(t *testing.T) {
	patch, err := validation.ProfilePatch(models.UpdateProfileRequest{DisplayName: ptr("Ivan")})
	if err != nil {
		t.Fatalf("expected the request to be accepted, got %v", err)
	}
	if patch.AvatarURL != nil || patch.Bio != nil || patch.GithubURL != nil || patch.WebsiteURL != nil {
		t.Fatalf("an absent field was given a value: %+v", patch)
	}
	if patch.ClearAvatarURL || patch.ClearBio || patch.ClearGithubURL || patch.ClearWebsiteURL {
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
