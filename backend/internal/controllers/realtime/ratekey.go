package realtime

import (
	"crypto/sha256"
	"encoding/hex"
)

func feedRateKey(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:8])
}
