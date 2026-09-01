package blobstore_test

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"

	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
)

const gpsMarker = "GPS-LATITUDE-55.7558-LONGITUDE-37.6173"

func sample(t *testing.T, encode func(*bytes.Buffer, image.Image) error) []byte {
	t.Helper()
	canvas := image.NewRGBA(image.Rect(0, 0, 8, 8))
	for x := range 8 {
		for y := range 8 {
			canvas.Set(x, y, color.RGBA{R: uint8(x * 20), G: uint8(y * 20), B: 90, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := encode(&buf, canvas); err != nil {
		t.Fatalf("encoding the sample failed: %v", err)
	}
	return buf.Bytes()
}

func jpegWithExif(t *testing.T) []byte {
	t.Helper()
	base := sample(t, func(b *bytes.Buffer, img image.Image) error {
		return jpeg.Encode(b, img, nil)
	})

	payload := append([]byte("Exif\x00\x00"), []byte(gpsMarker)...)
	segment := make([]byte, 0, len(payload)+4)
	segment = append(segment, 0xFF, 0xE1)
	length := make([]byte, 2)
	binary.BigEndian.PutUint16(length, uint16(len(payload)+2))
	segment = append(segment, length...)
	segment = append(segment, payload...)

	out := make([]byte, 0, len(base)+len(segment))
	out = append(out, base[:2]...)
	out = append(out, segment...)
	out = append(out, base[2:]...)
	return out
}

func pngWithTextChunk(t *testing.T) []byte {
	t.Helper()
	base := sample(t, func(b *bytes.Buffer, img image.Image) error {
		return png.Encode(b, img)
	})

	payload := append([]byte("Comment\x00"), []byte(gpsMarker)...)
	chunk := make([]byte, 0, len(payload)+12)
	size := make([]byte, 4)
	binary.BigEndian.PutUint32(size, uint32(len(payload)))
	chunk = append(chunk, size...)
	chunk = append(chunk, []byte("tEXt")...)
	chunk = append(chunk, payload...)
	chunk = append(chunk, 0, 0, 0, 0)

	out := make([]byte, 0, len(base)+len(chunk))
	out = append(out, base[:8]...)
	out = append(out, chunk...)
	out = append(out, base[8:]...)
	return out
}

func TestStripMetadataRemovesJPEGExif(t *testing.T) {
	data := jpegWithExif(t)
	if !bytes.Contains(data, []byte(gpsMarker)) {
		t.Fatal("the fixture does not carry the location marker")
	}

	stripped := blobstore.StripMetadata(data, blobstore.TypeJPEG)
	if bytes.Contains(stripped, []byte(gpsMarker)) {
		t.Fatal("the location survived the strip, so a photo would publish where it was taken")
	}
	if len(stripped) >= len(data) {
		t.Fatalf("nothing was removed: %d bytes in, %d out", len(data), len(stripped))
	}
}

func TestStripMetadataKeepsJPEGDecodable(t *testing.T) {
	stripped := blobstore.StripMetadata(jpegWithExif(t), blobstore.TypeJPEG)

	decoded, err := jpeg.Decode(bytes.NewReader(stripped))
	if err != nil {
		t.Fatalf("the stripped image no longer decodes: %v", err)
	}
	if decoded.Bounds().Dx() != 8 || decoded.Bounds().Dy() != 8 {
		t.Fatalf("dimensions changed: got %v", decoded.Bounds())
	}
}

func TestStripMetadataRemovesPNGTextChunk(t *testing.T) {
	data := pngWithTextChunk(t)
	if !bytes.Contains(data, []byte(gpsMarker)) {
		t.Fatal("the fixture does not carry the location marker")
	}

	stripped := blobstore.StripMetadata(data, blobstore.TypePNG)
	if bytes.Contains(stripped, []byte(gpsMarker)) {
		t.Fatal("the location survived the strip")
	}

	decoded, err := png.Decode(bytes.NewReader(stripped))
	if err != nil {
		t.Fatalf("the stripped image no longer decodes: %v", err)
	}
	if decoded.Bounds().Dx() != 8 {
		t.Fatalf("dimensions changed: got %v", decoded.Bounds())
	}
}

func TestStripMetadataLeavesPixelsIntact(t *testing.T) {
	original := sample(t, func(b *bytes.Buffer, img image.Image) error {
		return png.Encode(b, img)
	})
	stripped := blobstore.StripMetadata(pngWithTextChunk(t), blobstore.TypePNG)

	before, err := png.Decode(bytes.NewReader(original))
	if err != nil {
		t.Fatalf("decoding the original failed: %v", err)
	}
	after, err := png.Decode(bytes.NewReader(stripped))
	if err != nil {
		t.Fatalf("decoding the stripped image failed: %v", err)
	}

	for x := range 8 {
		for y := range 8 {
			if before.At(x, y) != after.At(x, y) {
				t.Fatalf("pixel %d,%d changed: stripping must not re-encode", x, y)
			}
		}
	}
}

func TestStripMetadataLeavesUnknownTypeAlone(t *testing.T) {
	data := []byte("not an image at all")
	if got := blobstore.StripMetadata(data, "application/octet-stream"); !bytes.Equal(got, data) {
		t.Fatal("an unsupported type must be returned untouched")
	}
}

func TestStripMetadataSurvivesTruncatedInput(t *testing.T) {
	for _, contentType := range []string{blobstore.TypeJPEG, blobstore.TypePNG, blobstore.TypeWebP} {
		for _, data := range [][]byte{nil, {}, {0xFF}, {0xFF, 0xD8}, []byte("RIFF")} {
			if got := blobstore.StripMetadata(data, contentType); got == nil && data != nil {
				t.Fatalf("%s: stripping a truncated input returned nil", contentType)
			}
		}
	}
}
