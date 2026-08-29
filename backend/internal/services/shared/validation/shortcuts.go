package validation

import (
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/GoatWhistle/timeline/internal/models"
)

const shortcutsField = "shortcuts"

func Shortcuts(raw models.Shortcuts) (models.Shortcuts, error) {
	if len(raw) > models.ShortcutMaxActions {
		return nil, models.NewValidation("too many shortcut overrides",
			models.FieldError{Field: shortcutsField,
				Message: "at most " + Itoa(models.ShortcutMaxActions) + " actions"})
	}

	cleaned := make(models.Shortcuts, len(raw))
	for action, combo := range raw {
		normalizedAction, normalizedCombo, err := shortcutEntry(action, combo)
		if err != nil {
			return nil, err
		}
		cleaned[normalizedAction] = normalizedCombo
	}
	return cleaned, shortcutCollision(cleaned)
}

func shortcutEntry(action, combo string) (string, string, error) {
	trimmedAction := strings.TrimSpace(action)
	if trimmedAction == "" || utf8.RuneCountInString(trimmedAction) > models.ShortcutMaxActionLen {
		return "", "", models.NewValidation("the action identifier is not accepted",
			models.FieldError{Field: shortcutsField, Message: "action: " + action})
	}

	normalized := strings.ToLower(strings.Join(strings.Fields(combo), " "))
	if normalized == "" || utf8.RuneCountInString(normalized) > models.ShortcutMaxComboLen {
		return "", "", models.NewValidation("the shortcut is not accepted",
			models.FieldError{Field: shortcutsField, Message: trimmedAction + ": empty or too long"})
	}
	if !models.ShortcutComboValid(normalized) {
		return "", "", models.NewValidation("the shortcut is not accepted",
			models.FieldError{Field: shortcutsField, Message: trimmedAction + ": " + normalized})
	}
	if models.ShortcutReserved(normalized) {
		return "", "", models.NewConflict("shortcut_reserved",
			"this shortcut belongs to the browser or the operating system: "+normalized)
	}
	return trimmedAction, normalized, nil
}

func shortcutCollision(cleaned models.Shortcuts) error {
	byCombo := make(map[string][]string, len(cleaned))
	for action, combo := range cleaned {
		byCombo[combo] = append(byCombo[combo], action)
	}
	for combo, actions := range byCombo {
		if len(actions) < 2 {
			continue
		}
		sort.Strings(actions)
		return models.NewConflict("shortcut_conflict",
			"the shortcut "+combo+" is claimed by "+strings.Join(actions, " and "))
	}
	return nil
}
