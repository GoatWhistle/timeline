package models

import "strings"

const (
	ShortcutMaxActions   = 64
	ShortcutMaxActionLen = 64
	ShortcutMaxComboLen  = 64
	ShortcutMaxSteps     = 2
)

type Shortcuts map[string]string

var shortcutModifiers = map[string]int{"mod": 1, "alt": 2, "shift": 3}

var shortcutNamedKeys = map[string]bool{
	"escape": true, "enter": true, "tab": true, "space": true, "backspace": true,
	"delete": true, "home": true, "end": true, "pageup": true, "pagedown": true,
	"arrowup": true, "arrowdown": true, "arrowleft": true, "arrowright": true,
	"f1": true, "f2": true, "f3": true, "f4": true, "f5": true, "f6": true,
	"f7": true, "f8": true, "f9": true, "f10": true, "f11": true, "f12": true,
}

var shortcutReserved = map[string]bool{
	"tab": true, "escape": true, "enter": true, "backspace": true,
	"mod+w": true, "mod+t": true, "mod+n": true, "mod+q": true, "mod+r": true,
	"mod+l": true, "mod+p": true, "mod+s": true, "mod+f": true, "mod+d": true,
	"mod+shift+w": true, "mod+shift+t": true, "mod+shift+n": true, "mod+shift+q": true,
	"mod+tab": true, "alt+tab": true, "mod+shift+tab": true,
	"f5": true, "f11": true, "f12": true,
}

func ShortcutReserved(combo string) bool {
	for _, step := range strings.Split(combo, " ") {
		if shortcutReserved[step] {
			return true
		}
	}
	return false
}

func ShortcutStepValid(step string) bool {
	parts := strings.Split(step, "+")
	key := parts[len(parts)-1]
	seen := 0
	for _, modifier := range parts[:len(parts)-1] {
		rank, ok := shortcutModifiers[modifier]
		if !ok || rank <= seen {
			return false
		}
		seen = rank
	}
	if shortcutNamedKeys[key] {
		return true
	}
	return len([]rune(key)) == 1 && key == strings.ToLower(key) && key != " "
}

func ShortcutComboValid(combo string) bool {
	steps := strings.Split(combo, " ")
	if len(steps) == 0 || len(steps) > ShortcutMaxSteps {
		return false
	}
	for _, step := range steps {
		if step == "" || !ShortcutStepValid(step) {
			return false
		}
	}
	return len(steps) == 1 || !strings.Contains(steps[0], "+")
}
