package blobstore

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

func pngBytes(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	img.Set(0, 0, color.RGBA{R: 1, G: 2, B: 3, A: 255})
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encoding png: %v", err)
	}
	return buf.Bytes()
}

func jpegBytes(t *testing.T, width, height int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		t.Fatalf("encoding jpeg: %v", err)
	}
	return buf.Bytes()
}

func TestInspectImageAcceptsRealImages(t *testing.T) {
	got, err := InspectImage(pngBytes(t, 12, 7))
	if err != nil {
		t.Fatalf("InspectImage returned %v, want a valid png", err)
	}
	if got.ContentType != TypePNG || got.Width != 12 || got.Height != 7 {
		t.Fatalf("got %+v, want image/png 12x7", got)
	}

	got, err = InspectImage(jpegBytes(t, 9, 5))
	if err != nil {
		t.Fatalf("InspectImage returned %v, want a valid jpeg", err)
	}
	if got.ContentType != TypeJPEG || got.Width != 9 || got.Height != 5 {
		t.Fatalf("got %+v, want image/jpeg 9x5", got)
	}
}

func TestInspectImageRejectsHostileContent(t *testing.T) {
	cases := map[string][]byte{
		"svg with script":   []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`),
		"html":              []byte("<!doctype html><html><body>hi</body></html>"),
		"zip":               {'P', 'K', 0x03, 0x04, 0, 0, 0, 0},
		"elf":               {0x7F, 'E', 'L', 'F', 2, 1, 1, 0},
		"empty":             {},
		"png magic only":    append([]byte{}, magicPNG...),
		"text named as png": []byte("this is definitely not an image"),
	}
	for name, data := range cases {
		if _, err := InspectImage(data); err == nil {
			t.Errorf("%s: InspectImage accepted a non-image", name)
		}
	}
}

func TestInspectImageRejectsPolyglotWithImagePrefix(t *testing.T) {
	polyglot := append(append([]byte{}, magicJPEG...), []byte("<script>alert(1)</script>")...)
	if _, err := InspectImage(polyglot); err == nil {
		t.Fatal("a file that only starts with jpeg magic must not be accepted")
	}
}

func TestSniffIgnoresDeclaredNameAndType(t *testing.T) {
	data := pngBytes(t, 2, 2)
	got, err := Sniff(data)
	if err != nil || got != TypePNG {
		t.Fatalf("Sniff = %q, %v; want image/png", got, err)
	}
	if ext := ExtensionFor(got); ext != "png" {
		t.Fatalf("ExtensionFor = %q, want png", ext)
	}
}
