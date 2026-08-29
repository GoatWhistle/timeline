package models_test

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func ptr(v string) *string { return &v }

func TestFormatFullNamePutsSurnameFirstInRussian(t *testing.T) {
	got := models.FormatFullName("ru", "Ivan", ptr("Sergeevich"), "Petrov")
	if got != "Petrov Ivan Sergeevich" {
		t.Fatalf("ru full name = %q, want %q", got, "Petrov Ivan Sergeevich")
	}
}

func TestFormatFullNamePutsGivenNameFirstInEnglish(t *testing.T) {
	got := models.FormatFullName("en", "John", ptr("Fitzgerald"), "Smith")
	if got != "John Fitzgerald Smith" {
		t.Fatalf("en full name = %q, want %q", got, "John Fitzgerald Smith")
	}
}

func TestFormatListNameDropsTheMiddleName(t *testing.T) {
	ru := models.FormatListName("ru", "Ivan", ptr("Sergeevich"), "Petrov")
	if ru != "Petrov Ivan" {
		t.Fatalf("ru list name = %q, want %q", ru, "Petrov Ivan")
	}
	en := models.FormatListName("en", "John", ptr("Fitzgerald"), "Smith")
	if en != "John Smith" {
		t.Fatalf("en list name = %q, want %q", en, "John Smith")
	}
}

func TestFormatAddressNameUsesPatronymicOnlyInRussian(t *testing.T) {
	ru := models.FormatAddressName("ru", "Ivan", ptr("Sergeevich"))
	if ru != "Ivan Sergeevich" {
		t.Fatalf("ru address name = %q, want %q", ru, "Ivan Sergeevich")
	}
	en := models.FormatAddressName("en", "John", ptr("Fitzgerald"))
	if en != "John" {
		t.Fatalf("en address name = %q, want %q", en, "John")
	}
}

func TestFormatNameSkipsAnAbsentMiddleName(t *testing.T) {
	if got := models.FormatFullName("ru", "Ivan", nil, "Petrov"); got != "Petrov Ivan" {
		t.Fatalf("full name without a patronymic = %q, want %q", got, "Petrov Ivan")
	}
	blank := ""
	if got := models.FormatFullName("en", "John", &blank, "Smith"); got != "John Smith" {
		t.Fatalf("full name with a blank middle name = %q, want %q", got, "John Smith")
	}
}

func TestNameInitialsComeFromGivenNameAndSurname(t *testing.T) {
	if got := models.NameInitials("Ivan", "Petrov"); got != "IP" {
		t.Fatalf("initials = %q, want %q", got, "IP")
	}
	if got := models.NameInitials("john", "smith"); got != "JS" {
		t.Fatalf("initials = %q, want %q", got, "JS")
	}
}
