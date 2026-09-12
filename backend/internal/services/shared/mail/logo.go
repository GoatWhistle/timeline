package mail

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"net/http"
	"strconv"
	"sync"
)

const logoScale = 12
const logoViewbox = 24

type logoBar struct {
	x, y, w, h, rx float64
	track          bool
}

var logoBars = []logoBar{
	{x: 2.5, y: 4.6, w: 12, h: 4.4, rx: 2.2, track: true},
	{x: 7, y: 9.8, w: 14.5, h: 4.4, rx: 2.2, track: false},
	{x: 4.5, y: 15, w: 9.5, h: 4.4, rx: 2.2, track: true},
}

func renderLogoPNG(solidHex string, trackOpacity float64) []byte {
	size := logoViewbox * logoScale
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	draw.Draw(img, img.Bounds(), image.Transparent, image.Point{}, draw.Src)

	solid := hexColor(solidHex)
	track := solid
	track.A = uint8(math.Round(255 * trackOpacity))

	for _, bar := range logoBars {
		fill := solid
		if bar.track {
			fill = track
		}
		drawRoundedRect(img, bar, fill)
	}

	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}

func drawRoundedRect(img *image.RGBA, bar logoBar, fill color.RGBA) {
	x0, y0 := bar.x*logoScale, bar.y*logoScale
	x1, y1 := (bar.x+bar.w)*logoScale, (bar.y+bar.h)*logoScale
	r := bar.rx * logoScale

	for y := int(y0); y < int(y1); y++ {
		for x := int(x0); x < int(x1); x++ {
			if insideRoundedRect(float64(x)+0.5, float64(y)+0.5, x0, y0, x1, y1, r) {
				img.SetRGBA(x, y, fill)
			}
		}
	}
}

func insideRoundedRect(px, py, x0, y0, x1, y1, r float64) bool {
	cx := clamp(px, x0+r, x1-r)
	cy := clamp(py, y0+r, y1-r)
	dx, dy := px-cx, py-cy
	return dx*dx+dy*dy <= r*r
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func hexColor(hex string) color.RGBA {
	r, _ := strconv.ParseUint(hex[1:3], 16, 8)
	g, _ := strconv.ParseUint(hex[3:5], 16, 8)
	b, _ := strconv.ParseUint(hex[5:7], 16, 8)
	return color.RGBA{R: uint8(r), G: uint8(g), B: uint8(b), A: 255}
}

var (
	logoOnce  sync.Once
	logoLight []byte
	logoDark  []byte
)

func logoPNG(theme string) []byte {
	logoOnce.Do(func() {
		logoLight = renderLogoPNG(colorLogoLight, 0.75)
		logoDark = renderLogoPNG(colorLogoDark, 0.55)
	})
	if theme == "dark" {
		return logoDark
	}
	return logoLight
}

func LogoHandler(theme string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body := logoPNG(theme)
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		_, _ = w.Write(body)
	}
}
