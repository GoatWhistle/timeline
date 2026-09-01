package blobstore

import (
	"bytes"
	"encoding/binary"
	"errors"
)

var ErrUnsupportedType = errors.New("unsupported image type")

var (
	magicPNG  = []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}
	magicJPEG = []byte{0xFF, 0xD8, 0xFF}
	magicRIFF = []byte("RIFF")
	magicWEBP = []byte("WEBP")
)

func Sniff(data []byte) (string, error) {
	switch {
	case bytes.HasPrefix(data, magicPNG):
		return TypePNG, nil
	case bytes.HasPrefix(data, magicJPEG):
		return TypeJPEG, nil
	case len(data) >= 12 && bytes.HasPrefix(data, magicRIFF) && bytes.Equal(data[8:12], magicWEBP):
		return TypeWebP, nil
	}
	return "", ErrUnsupportedType
}

func WebPDimensions(data []byte) (int, int, error) {
	if len(data) < 20 || !bytes.HasPrefix(data, magicRIFF) || !bytes.Equal(data[8:12], magicWEBP) {
		return 0, 0, ErrUnsupportedType
	}
	chunk := data[12:]
	body := chunk[8:]
	switch string(chunk[0:4]) {
	case "VP8 ":
		return webpLossy(body)
	case "VP8L":
		return webpLossless(body)
	case "VP8X":
		return webpExtended(body)
	}
	return 0, 0, ErrUnsupportedType
}

func webpLossy(body []byte) (int, int, error) {
	if len(body) < 10 || body[3] != 0x9D || body[4] != 0x01 || body[5] != 0x2A {
		return 0, 0, ErrUnsupportedType
	}
	width := int(binary.LittleEndian.Uint16(body[6:8]) & 0x3FFF)
	height := int(binary.LittleEndian.Uint16(body[8:10]) & 0x3FFF)
	return width, height, nil
}

func webpLossless(body []byte) (int, int, error) {
	if len(body) < 5 || body[0] != 0x2F {
		return 0, 0, ErrUnsupportedType
	}
	bits := binary.LittleEndian.Uint32(body[1:5])
	width := int(bits&0x3FFF) + 1
	height := int((bits>>14)&0x3FFF) + 1
	return width, height, nil
}

func webpExtended(body []byte) (int, int, error) {
	if len(body) < 10 {
		return 0, 0, ErrUnsupportedType
	}
	width := int(uint32(body[4]) | uint32(body[5])<<8 | uint32(body[6])<<16)
	height := int(uint32(body[7]) | uint32(body[8])<<8 | uint32(body[9])<<16)
	return width + 1, height + 1, nil
}
