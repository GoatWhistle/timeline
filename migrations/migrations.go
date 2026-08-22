// Package migrations содержит SQL-миграции схемы, встроенные в бинарь.
package migrations

import "embed"

// FS — файловая система миграций для golang-migrate.
//
//go:embed *.sql
var FS embed.FS
