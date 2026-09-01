package blobstore

import (
	"bytes"
	"image"
	_ "image/jpeg"
	_ "image/png"
)

type Image struct {
	ContentType string
	Width       int
	Height      int
	Size        int64
}

func InspectImage(data []byte) (Image, error) {
	contentType, err := Sniff(data)
	if err != nil {
		return Image{}, err
	}

	var width, height int
	if contentType == TypeWebP {
		width, height, err = WebPDimensions(data)
		if err != nil {
			return Image{}, err
		}
	} else {
		cfg, format, decodeErr := image.DecodeConfig(bytes.NewReader(data))
		if decodeErr != nil {
			return Image{}, ErrUnsupportedType
		}
		if !matchesFormat(contentType, format) {
			return Image{}, ErrUnsupportedType
		}
		width, height = cfg.Width, cfg.Height
	}

	if width < 1 || height < 1 {
		return Image{}, ErrUnsupportedType
	}
	return Image{
		ContentType: contentType,
		Width:       width,
		Height:      height,
		Size:        int64(len(data)),
	}, nil
}

func matchesFormat(contentType, format string) bool {
	switch contentType {
	case TypePNG:
		return format == "png"
	case TypeJPEG:
		return format == "jpeg"
	}
	return false
}
