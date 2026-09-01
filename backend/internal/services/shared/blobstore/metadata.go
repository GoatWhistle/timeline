package blobstore

import (
	"bytes"
	"encoding/binary"
)

var pngKeptChunks = map[string]bool{
	"IHDR": true,
	"PLTE": true,
	"IDAT": true,
	"IEND": true,
	"tRNS": true,
	"gAMA": true,
	"cHRM": true,
	"sRGB": true,
	"iCCP": true,
	"bKGD": true,
	"pHYs": true,
	"sBIT": true,
}

var webpKeptChunks = map[string]bool{
	"VP8 ":  true,
	"VP8L":  true,
	"VP8X":  true,
	"ALPH":  true,
	"ANIM":  true,
	"ANMF":  true,
	"ICCP":  true,
}

func StripMetadata(data []byte, contentType string) []byte {
	switch contentType {
	case TypeJPEG:
		return stripJPEG(data)
	case TypePNG:
		return stripPNG(data)
	case TypeWebP:
		return stripWebP(data)
	default:
		return data
	}
}

func stripJPEG(data []byte) []byte {
	if len(data) < 2 || data[0] != 0xFF || data[1] != 0xD8 {
		return data
	}

	out := make([]byte, 0, len(data))
	out = append(out, 0xFF, 0xD8)

	i := 2
	for i+3 < len(data) {
		if data[i] != 0xFF {
			return data
		}
		marker := data[i+1]
		if marker == 0xD8 || (marker >= 0xD0 && marker <= 0xD7) {
			i += 2
			continue
		}
		if marker == 0xDA {
			out = append(out, data[i:]...)
			return out
		}
		length := int(binary.BigEndian.Uint16(data[i+2 : i+4]))
		if length < 2 || i+2+length > len(data) {
			return data
		}
		if !droppedJPEGMarker(marker) {
			out = append(out, data[i:i+2+length]...)
		}
		i += 2 + length
	}
	return data
}

func droppedJPEGMarker(marker byte) bool {
	if marker >= 0xE0 && marker <= 0xEF {
		return marker != 0xEE
	}
	return marker == 0xFE
}

func stripPNG(data []byte) []byte {
	const signature = 8
	if len(data) < signature {
		return data
	}

	out := make([]byte, 0, len(data))
	out = append(out, data[:signature]...)

	i := signature
	for i+8 <= len(data) {
		length := int(binary.BigEndian.Uint32(data[i : i+4]))
		if length < 0 || i+12+length > len(data) {
			return data
		}
		name := string(data[i+4 : i+8])
		end := i + 12 + length
		if pngKeptChunks[name] {
			out = append(out, data[i:end]...)
		}
		if name == "IEND" {
			return out
		}
		i = end
	}
	return data
}

func stripWebP(data []byte) []byte {
	const header = 12
	if len(data) < header || !bytes.Equal(data[:4], []byte("RIFF")) ||
		!bytes.Equal(data[8:12], []byte("WEBP")) {
		return data
	}

	body := make([]byte, 0, len(data))
	i := header
	for i+8 <= len(data) {
		length := int(binary.BigEndian.Uint32(
			[]byte{data[i+7], data[i+6], data[i+5], data[i+4]}))
		if length < 0 {
			return data
		}
		padded := length + length%2
		end := i + 8 + padded
		if end > len(data) {
			return data
		}
		if webpKeptChunks[string(data[i:i+4])] {
			body = append(body, data[i:end]...)
		}
		i = end
	}

	out := make([]byte, 0, header+len(body))
	out = append(out, data[:4]...)
	size := make([]byte, 4)
	binary.LittleEndian.PutUint32(size, uint32(4+len(body)))
	out = append(out, size...)
	out = append(out, data[8:12]...)
	out = append(out, body...)
	return out
}
