package resourcelink

import "github.com/GoatWhistle/timeline/internal/adapters/postgres"

var mapError = postgres.MapError
var itoa = postgres.Itoa

func join(items []string) string {
	out := ""
	for i, item := range items {
		if i > 0 {
			out += ", "
		}
		out += item
	}
	return out
}
