package models

type CatalogSortField string

const (
	CatalogSortStartAt CatalogSortField = "start_at"
	CatalogSortEndAt   CatalogSortField = "end_at"
	CatalogSortTitle   CatalogSortField = "title"
)

type CatalogSortDirection string

const (
	CatalogSortAsc  CatalogSortDirection = "asc"
	CatalogSortDesc CatalogSortDirection = "desc"
)

type CatalogSort struct {
	Field     CatalogSortField
	Direction CatalogSortDirection
}

var DefaultCatalogSort = CatalogSort{Field: CatalogSortStartAt, Direction: CatalogSortAsc}

var catalogSortFields = map[CatalogSortField]struct{}{
	CatalogSortStartAt: {},
	CatalogSortEndAt:   {},
	CatalogSortTitle:   {},
}

var catalogSortDirections = map[CatalogSortDirection]struct{}{
	CatalogSortAsc:  {},
	CatalogSortDesc: {},
}

func ParseCatalogSortField(raw string) (CatalogSortField, error) {
	if raw == "" {
		return DefaultCatalogSort.Field, nil
	}
	field := CatalogSortField(raw)
	if _, ok := catalogSortFields[field]; !ok {
		return "", NewValidationf("unknown sort field %q", raw)
	}
	return field, nil
}

func ParseCatalogSortDirection(raw string) (CatalogSortDirection, error) {
	if raw == "" {
		return DefaultCatalogSort.Direction, nil
	}
	direction := CatalogSortDirection(raw)
	if _, ok := catalogSortDirections[direction]; !ok {
		return "", NewValidationf("unknown sort direction %q", raw)
	}
	return direction, nil
}

func ParseCatalogSort(field, direction string) (CatalogSort, error) {
	parsedField, err := ParseCatalogSortField(field)
	if err != nil {
		return CatalogSort{}, err
	}
	parsedDirection, err := ParseCatalogSortDirection(direction)
	if err != nil {
		return CatalogSort{}, err
	}
	return CatalogSort{Field: parsedField, Direction: parsedDirection}, nil
}
