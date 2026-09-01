package blobstore

import "strings"

const (
	TypePNG  = "image/png"
	TypeJPEG = "image/jpeg"
	TypeWebP = "image/webp"
)

func ExtensionFor(contentType string) string {
	switch contentType {
	case TypePNG:
		return "png"
	case TypeJPEG:
		return "jpg"
	case TypeWebP:
		return "webp"
	}
	return ""
}

func ContentTypeForKey(key string) string {
	_, ext, found := strings.Cut(key, ".")
	if !found {
		return "application/octet-stream"
	}
	switch ext {
	case "png":
		return TypePNG
	case "jpg":
		return TypeJPEG
	case "webp":
		return TypeWebP
	}
	return "application/octet-stream"
}
