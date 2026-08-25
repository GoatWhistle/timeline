// Package ratelimit содержит ограничитель частоты запросов на скользящем окне.
// Счётчики хранятся в памяти процесса: для развёртывания MVP с одним экземпляром
// API этого достаточно, а внешнее хранилище усложнило бы состав системы.
package ratelimit

import (
	"sync"
	"time"
)

// Limiter ограничивает число попыток по ключу за окно времени.
type Limiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	now      func() time.Time
	lastGC   time.Time
}

// New создаёт ограничитель.
func New() *Limiter {
	return &Limiter{attempts: make(map[string][]time.Time), now: time.Now}
}

// NewWithClock создаёт ограничитель с подменяемыми часами; используется в тестах.
func NewWithClock(now func() time.Time) *Limiter {
	return &Limiter{attempts: make(map[string][]time.Time), now: now}
}

// Allow регистрирует попытку и сообщает, укладывается ли она в лимит.
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

// Reset очищает счётчик ключа: применяется после успешного входа.
func (l *Limiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}

// gc периодически удаляет ключи, у которых не осталось актуальных попыток.
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
