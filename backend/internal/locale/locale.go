package locale

import (
	"embed"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
)

//go:embed messages/*.json
var files embed.FS

const Default = "ru"

var (
	once     sync.Once
	catalogs map[string]map[string]string
)

func load() {
	catalogs = make(map[string]map[string]string)
	entries, err := files.ReadDir("messages")
	if err != nil {
		return
	}
	for _, entry := range entries {
		name := entry.Name()
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		raw, readErr := files.ReadFile("messages/" + name)
		if readErr != nil {
			continue
		}
		table := make(map[string]string)
		if json.Unmarshal(raw, &table) != nil {
			continue
		}
		catalogs[strings.TrimSuffix(name, ".json")] = table
	}
}

func catalog(lang string) map[string]string {
	once.Do(load)
	if table, ok := catalogs[lang]; ok {
		return table
	}
	return catalogs[Default]
}

func Has(lang string) bool {
	once.Do(load)
	_, ok := catalogs[lang]
	return ok
}

func Keys(lang string) []string {
	table := catalog(lang)
	out := make([]string, 0, len(table))
	for key := range table {
		out = append(out, key)
	}
	return out
}

func Message(lang, key string, args ...string) string {
	table := catalog(lang)
	text, ok := table[key]
	if !ok {
		return key
	}
	if len(args) == 0 {
		return text
	}
	pairs := make([]string, 0, len(args))
	for i := 0; i+1 < len(args); i += 2 {
		pairs = append(pairs, "{{"+args[i]+"}}", args[i+1])
	}
	return strings.NewReplacer(pairs...).Replace(text)
}

func Plural(lang, prefix string, n int) string {
	form := pluralForm(lang, n)
	return fmt.Sprintf(Message(lang, prefix+"."+form), n)
}

func pluralForm(lang string, n int) string {
	if lang != "ru" {
		if n == 1 {
			return "one"
		}
		return "many"
	}
	mod100 := n % 100
	mod10 := n % 10
	switch {
	case mod100 >= 11 && mod100 <= 14:
		return "many"
	case mod10 == 1:
		return "one"
	case mod10 >= 2 && mod10 <= 4:
		return "few"
	default:
		return "many"
	}
}
