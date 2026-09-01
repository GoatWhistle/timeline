package models

import "strings"

const AvatarURLPrefix = "/api/v1/avatars/"

func AvatarURL(key string) string {
	return AvatarURLPrefix + key
}

func AvatarKeyFromURL(url *string) string {
	if url == nil {
		return ""
	}
	value := strings.TrimSpace(*url)
	if !strings.HasPrefix(value, AvatarURLPrefix) {
		return ""
	}
	return strings.TrimPrefix(value, AvatarURLPrefix)
}
