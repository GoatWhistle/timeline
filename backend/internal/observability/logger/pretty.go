package logger

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"slices"
	"strings"
	"sync"
	"time"
)

const (
	timeFormat     = "15:04:05.000"
	messagePadding = 22
)

type PrettyOptions struct {
	Level slog.Leveler
	Color bool
}

type prettyHandler struct {
	opts   PrettyOptions
	out    io.Writer
	mu     *sync.Mutex
	attrs  []slog.Attr
	groups []string
}

func NewPrettyHandler(out io.Writer, opts PrettyOptions) slog.Handler {
	if opts.Level == nil {
		opts.Level = slog.LevelInfo
	}
	return &prettyHandler{opts: opts, out: out, mu: &sync.Mutex{}}
}

func (h *prettyHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.opts.Level.Level()
}

func (h *prettyHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	if len(attrs) == 0 {
		return h
	}
	clone := h.clone()
	clone.attrs = append(clone.attrs, h.qualify(attrs)...)
	return clone
}

func (h *prettyHandler) WithGroup(name string) slog.Handler {
	if name == "" {
		return h
	}
	clone := h.clone()
	clone.groups = append(clone.groups, name)
	return clone
}

func (h *prettyHandler) clone() *prettyHandler {
	return &prettyHandler{
		opts:   h.opts,
		out:    h.out,
		mu:     h.mu,
		attrs:  slices.Clip(h.attrs),
		groups: slices.Clip(h.groups),
	}
}

func (h *prettyHandler) qualify(attrs []slog.Attr) []slog.Attr {
	if len(h.groups) == 0 {
		return attrs
	}
	prefix := strings.Join(h.groups, ".") + "."
	out := make([]slog.Attr, 0, len(attrs))
	for _, a := range attrs {
		out = append(out, slog.Attr{Key: prefix + a.Key, Value: a.Value})
	}
	return out
}

func (h *prettyHandler) Handle(_ context.Context, rec slog.Record) error {
	attrs := make(map[string]slog.Value, len(h.attrs)+rec.NumAttrs())
	order := make([]string, 0, len(h.attrs)+rec.NumAttrs())

	collect := func(a slog.Attr) {
		if a.Equal(slog.Attr{}) {
			return
		}
		if _, seen := attrs[a.Key]; !seen {
			order = append(order, a.Key)
		}
		attrs[a.Key] = a.Value.Resolve()
	}

	for _, a := range h.attrs {
		collect(a)
	}
	for _, a := range h.qualify(recordAttrs(rec)) {
		collect(a)
	}

	buf := &strings.Builder{}
	h.writeHeader(buf, rec)

	if rec.Message == accessLogMessage {
		h.writeAccessLog(buf, attrs)
		order = slices.DeleteFunc(order, func(k string) bool { return slices.Contains(accessLogKeys, k) })
	}

	for _, key := range order {
		h.writeAttr(buf, key, attrs[key])
	}
	buf.WriteString("\n")

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := io.WriteString(h.out, buf.String())
	return err
}

func recordAttrs(rec slog.Record) []slog.Attr {
	out := make([]slog.Attr, 0, rec.NumAttrs())
	rec.Attrs(func(a slog.Attr) bool {
		out = append(out, a)
		return true
	})
	return out
}

func (h *prettyHandler) writeHeader(buf *strings.Builder, rec slog.Record) {
	stamp := rec.Time
	if stamp.IsZero() {
		stamp = time.Now()
	}
	buf.WriteString(h.paint(ansiDim, stamp.Format(timeFormat)))
	buf.WriteString(" ")
	buf.WriteString(h.paint(levelColor(rec.Level)+ansiBold, fmt.Sprintf("%-*s", levelPadding, levelLabel(rec.Level))))
	buf.WriteString(" ")
	buf.WriteString(h.paint(ansiBold+ansiWhite, rec.Message))
	if pad := messagePadding - len([]rune(rec.Message)); pad > 0 {
		buf.WriteString(strings.Repeat(" ", pad))
	}
}

func (h *prettyHandler) writeAttr(buf *strings.Builder, key string, value slog.Value) {
	buf.WriteString(" ")
	buf.WriteString(h.paint(ansiDim, key+"="))

	if key == "stack" {
		buf.WriteString("\n")
		buf.WriteString(h.paint(ansiDim, indentBlock(value.String())))
		return
	}

	rendered := renderValue(value)
	switch key {
	case "error", "panic":
		buf.WriteString(h.paint(ansiBrightRed, rendered))
	default:
		buf.WriteString(h.paint(ansiWhite, rendered))
	}
}

func (h *prettyHandler) paint(color, text string) string {
	if !h.opts.Color {
		return text
	}
	return color + text + ansiReset
}
