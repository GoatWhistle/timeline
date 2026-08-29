package controllers

import "time"

type Limiter interface {
	Allow(key string, limit int, window time.Duration) bool
}
