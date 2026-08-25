package services

import (
	"net/mail"
	"net/url"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// normalizeEmail приводит адрес к нижнему регистру без окружающих пробелов.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// validateEmail проверяет синтаксис адреса и возвращает нормализованное значение.
func validateEmail(field, value string) (string, error) {
	normalized := normalizeEmail(value)
	if normalized == "" {
		return "", models.NewValidation("укажите адрес электронной почты",
			models.FieldError{Field: field, Message: "обязательное поле"})
	}
	if len(normalized) > 254 {
		return "", models.NewValidation("адрес слишком длинный",
			models.FieldError{Field: field, Message: "не более 254 символов"})
	}
	if _, err := mail.ParseAddress(normalized); err != nil {
		return "", models.NewValidation("некорректный адрес электронной почты",
			models.FieldError{Field: field, Message: "некорректный формат"})
	}
	return normalized, nil
}

// validatePassword проверяет минимальные требования к паролю.
func validatePassword(value string, minLength int) error {
	if utf8.RuneCountInString(value) < minLength {
		return models.NewValidation("пароль слишком короткий",
			models.FieldError{Field: "password", Message: "не менее " + itoa(minLength) + " символов"})
	}
	if len(value) > 512 {
		return models.NewValidation("пароль слишком длинный",
			models.FieldError{Field: "password", Message: "не более 512 символов"})
	}
	return nil
}

// validateText проверяет обязательное текстовое поле и возвращает его без пробелов.
func validateText(field, value string, minLen, maxLen int) (string, error) {
	trimmed := strings.TrimSpace(value)
	length := utf8.RuneCountInString(trimmed)
	if length < minLen {
		return "", models.NewValidation("поле обязательно",
			models.FieldError{Field: field, Message: "не менее " + itoa(minLen) + " символов"})
	}
	if length > maxLen {
		return "", models.NewValidation("значение слишком длинное",
			models.FieldError{Field: field, Message: "не более " + itoa(maxLen) + " символов"})
	}
	return trimmed, nil
}

// validateHTTPS проверяет, что ссылка использует протокол HTTPS.
func validateHTTPS(field, value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return "", models.NewValidation("ссылка должна начинаться с https://",
			models.FieldError{Field: field, Message: "требуется абсолютный HTTPS-адрес"})
	}
	return trimmed, nil
}

// parseChannel разбирает значение канала доставки.
func parseChannel(field, value string) (models.Channel, error) {
	channel := models.Channel(strings.ToUpper(strings.TrimSpace(value)))
	if !channel.Valid() {
		return "", models.NewValidation("некорректный канал доставки",
			models.FieldError{Field: field, Message: "допустимы TELEGRAM и EMAIL"})
	}
	return channel, nil
}

func itoa(n int) string { return strconv.Itoa(n) }
