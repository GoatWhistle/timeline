package mail

import (
	"bytes"
	"image/png"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLogoPNGDecodesAsAValidImageForBothThemes(t *testing.T) {
	for _, theme := range []string{"light", "dark"} {
		body := logoPNG(theme)
		img, err := png.Decode(bytes.NewReader(body))
		if err != nil {
			t.Fatalf("%s: not a valid PNG: %v", theme, err)
		}
		if img.Bounds().Dx() == 0 || img.Bounds().Dy() == 0 {
			t.Fatalf("%s: decoded image has no size", theme)
		}
	}
}

func TestLogoPNGDiffersBetweenThemes(t *testing.T) {
	if bytes.Equal(logoPNG("light"), logoPNG("dark")) {
		t.Fatal("the light and dark logos must not be byte-identical")
	}
}

func TestLogoHandlerServesPNGWithLongCache(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/mail/logo-dark.png", nil)
	rec := httptest.NewRecorder()
	LogoHandler("dark")(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if rec.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("content-type = %q, want image/png", rec.Header().Get("Content-Type"))
	}
	if rec.Header().Get("Cache-Control") == "" {
		t.Fatal("the logo asset must be cacheable")
	}
	if !bytes.Equal(rec.Body.Bytes(), logoPNG("dark")) {
		t.Fatal("handler body does not match the dark logo bytes")
	}
}

func TestLogoHandlerServesTheLightThemeSeparately(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/mail/logo-light.png", nil)
	rec := httptest.NewRecorder()
	LogoHandler("light")(rec, req)

	if !bytes.Equal(rec.Body.Bytes(), logoPNG("light")) {
		t.Fatal("handler body does not match the light logo bytes")
	}
}
