package ratelimit

import (
	"sync"
	"time"
)

type Limiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	now      func() time.Time
	lastGC   time.Time
}

func New() *Limiter {
	return &Limiter{attempts: make(map[string][]time.Time), now: time.Now}
}

func NewWithClock(now func() time.Time) *Limiter {
	return &Limiter{attempts: make(map[string][]time.Time), now: now}
}

func (l *Limiter) Allow(key string, limit int, window time.Duration) bool {
	if limit <= 0 {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	l.gc(now, window)

	cutoff := now.Add(-window)
	kept := l.attempts[key][:0]
	for _, at := range l.attempts[key] {
		if at.After(cutoff) {
			kept = append(kept, at)
		}
	}
	if len(kept) >= limit {
		l.attempts[key] = kept
		return false
	}
	l.attempts[key] = append(kept, now)
	return true
}

func (l *Limiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}

func (l *Limiter) gc(now time.Time, window time.Duration) {
	if now.Sub(l.lastGC) < window {
		return
	}
	l.lastGC = now
	cutoff := now.Add(-window)
	for key, attempts := range l.attempts {
		fresh := false
		for _, at := range attempts {
			if at.After(cutoff) {
				fresh = true
				break
			}
		}
		if !fresh {
			delete(l.attempts, key)
		}
	}
}
