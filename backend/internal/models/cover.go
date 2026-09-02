package models

import "strings"

const CoverURLPrefix = "/api/v1/covers/"

type CoverSource string

const (
	CoverSourceManual CoverSource = "MANUAL"
	CoverSourceAuto   CoverSource = "AUTO"
)

func CoverURL(key string) string {
	return CoverURLPrefix + key
}

func CoverKeyFromURL(url *string) string {
	if url == nil {
		return ""
	}
	value := strings.TrimSpace(*url)
	if !strings.HasPrefix(value, CoverURLPrefix) {
		return ""
	}
	return strings.TrimPrefix(value, CoverURLPrefix)
}

type EventCoverKeys struct {
	Manual string
	Auto   string
}

func (e *Event) CoverKeys() EventCoverKeys {
	return EventCoverKeys{
		Manual: CoverKeyFromURL(e.CoverManualURL),
		Auto:   CoverKeyFromURL(e.CoverAutoURL),
	}
}

func (e *Event) EffectiveCoverURL() *string {
	if e.CoverManualURL != nil {
		return e.CoverManualURL
	}
	return e.CoverAutoURL
}

func (e *Event) EffectiveCoverSource() *CoverSource {
	switch {
	case e.CoverManualURL != nil:
		source := CoverSourceManual
		return &source
	case e.CoverAutoURL != nil:
		source := CoverSourceAuto
		return &source
	}
	return nil
}
