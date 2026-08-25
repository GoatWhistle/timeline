package repositories

import "strconv"

// itoa возвращает десятичное представление номера параметра запроса.
func itoa(n int) string { return strconv.Itoa(n) }
