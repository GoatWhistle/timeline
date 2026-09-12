package blobstore

import (
	"bytes"
	"image"
	"image/color"
	"image/color/palette"
	"image/gif"
	"os"
	"strings"
	"testing"
)

func animatedGIFBytes(t *testing.T, width, height, frames int) []byte {
	t.Helper()
	animation := gif.GIF{}
	for index := 0; index < frames; index++ {
		frame := image.NewPaletted(image.Rect(0, 0, width, height), palette.Plan9)
		frame.Set(index%width, 0, color.RGBA{R: 255, A: 255})
		animation.Image = append(animation.Image, frame)
		animation.Delay = append(animation.Delay, 10)
	}
	var buf bytes.Buffer
	if err := gif.EncodeAll(&buf, &animation); err != nil {
		t.Fatalf("encoding gif: %v", err)
	}
	return buf.Bytes()
}

func TestInspectImageAcceptsGIF(t *testing.T) {
	got, err := InspectImage(animatedGIFBytes(t, 10, 6, 1))
	if err != nil {
		t.Fatalf("InspectImage returned %v, want a valid gif", err)
	}
	if got.ContentType != TypeGIF || got.Width != 10 || got.Height != 6 {
		t.Fatalf("got %+v, want image/gif 10x6", got)
	}
}

func TestInspectingAnAnimatedGIFLeavesEveryFrameIntact(t *testing.T) {
	const frames = 4
	data := animatedGIFBytes(t, 8, 8, frames)
	original := append([]byte(nil), data...)

	if _, err := InspectImage(data); err != nil {
		t.Fatalf("InspectImage rejected an animated gif: %v", err)
	}

	if !bytes.Equal(data, original) {
		t.Error("inspection rewrote the bytes; an avatar path that re-encodes turns " +
			"an animation into a still picture")
	}
	decoded, err := gif.DecodeAll(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("the inspected bytes no longer decode as a gif: %v", err)
	}
	if len(decoded.Image) != frames {
		t.Errorf("the animation lost frames: got %d, want %d", len(decoded.Image), frames)
	}
}

func TestEveryDecodedFormatRegistersItsDecoderInProductionCode(t *testing.T) {
	source, err := os.ReadFile("image.go")
	if err != nil {
		t.Fatalf("reading image.go: %v", err)
	}
	for contentType, decoder := range map[string]string{
		TypePNG:  `_ "image/png"`,
		TypeJPEG: `_ "image/jpeg"`,
		TypeGIF:  `_ "image/gif"`,
	} {
		if !strings.Contains(string(source), decoder) {
			t.Errorf("image.go does not import %s, so %s decodes only where a test happens to "+
				"import it; in the binary the upload is refused", decoder, contentType)
		}
	}
}

func TestGIFTravelsTheSameRouteAsEveryOtherFormat(t *testing.T) {
	if got := ExtensionFor(TypeGIF); got != "gif" {
		t.Errorf("ExtensionFor(%q) = %q, want \"gif\"; a stored avatar needs its extension",
			TypeGIF, got)
	}
	if got := ContentTypeForKey("abcdef.gif"); got != TypeGIF {
		t.Errorf("ContentTypeForKey = %q, want %q; a served avatar needs its content type",
			got, TypeGIF)
	}
	sniffed, err := Sniff(animatedGIFBytes(t, 4, 4, 2))
	if err != nil || sniffed != TypeGIF {
		t.Errorf("Sniff = %q, %v; want %q with no error", sniffed, err, TypeGIF)
	}
}
