package blobstore

import "testing"

func TestValidKeyRejectsTraversalAndSeparators(t *testing.T) {
	hostile := []string{
		"../etc/passwd",
		"..",
		"../../a.png",
		"a/b.png",
		`a\b.png`,
		"/abs.png",
		"C:a.png",
		"a.png/../b.png",
		"a..png",
		"a.b.png",
		"noextension",
		".png",
		"a.",
		"",
		"a png.png",
		"a\x00.png",
		"%2e%2e%2fa.png",
	}
	for _, key := range hostile {
		if ValidKey(key) {
			t.Errorf("ValidKey(%q) = true, want false", key)
		}
	}
}

func TestValidKeyAcceptsGeneratedKeys(t *testing.T) {
	good := []string{
		"abc123.png",
		"a-b_c.jpg",
		"HN7l2Qx-_9.webp",
	}
	for _, key := range good {
		if !ValidKey(key) {
			t.Errorf("ValidKey(%q) = false, want true", key)
		}
	}
}

func TestValidKeyRejectsOverlongKey(t *testing.T) {
	long := make([]byte, maxKeyLength+1)
	for i := range long {
		long[i] = 'a'
	}
	if ValidKey(string(long) + ".png") {
		t.Fatal("an overlong key must be rejected")
	}
}
