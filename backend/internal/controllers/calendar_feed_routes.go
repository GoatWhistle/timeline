package controllers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
)

func FeedRateKey(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:8])
}

func mountCalendarFeed(mux *http.ServeMux, rt *routes, api string, c *CalendarFeedController) {
	mux.Handle("GET "+api+"/me/calendar-feed", rt.authd(c.Describe))
	mux.Handle("POST "+api+"/me/calendar-feed", rt.authd(c.Create))
	mux.Handle("POST "+api+"/me/calendar-feed/rotate", rt.authd(c.Rotate))
	mux.Handle("DELETE "+api+"/me/calendar-feed", rt.authd(c.Revoke))

	mux.Handle("GET "+api+"/calendar/{token}/feed.ics", http.HandlerFunc(c.Feed))
	mux.Handle("HEAD "+api+"/calendar/{token}/feed.ics", http.HandlerFunc(c.Feed))
}
