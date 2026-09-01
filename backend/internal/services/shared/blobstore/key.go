package blobstore

import (
	"errors"
	"strings"
)

var ErrInvalidKey = errors.New("invalid blob key")

const maxKeyLength = 128

func ValidKey(key string) bool {
	if key == "" || len(key) > maxKeyLength {
		return false
	}
	dots := 0
	for i := 0; i < len(key); i++ {
		c := key[i]
		switch {
		case c >= 'a' && c <= 'z',
			c >= 'A' && c <= 'Z',
			c >= '0' && c <= '9',
			c == '-', c == '_':
		case c == '.':
			dots++
		default:
			return false
		}
	}
	if dots != 1 {
		return false
	}
	name, ext, _ := strings.Cut(key, ".")
	return name != "" && ext != ""
}
