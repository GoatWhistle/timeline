package controllers

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

const rolesTableFile = "apitest/roles_integration_test.go"

var mountFiles = []string{
	"router_mounts.go",
	"link_mounts.go",
	"personal_mounts.go",
	"realtime_mounts.go",
}

var adminMount = regexp.MustCompile(
	`mux\.Handle\("(GET|POST|PUT|PATCH|DELETE) "\+api\+"([^"]+)",\s*rt\.admin\(`)

func readSource(t *testing.T, name string) string {
	t.Helper()
	body, err := os.ReadFile(filepath.Clean(name))
	if err != nil {
		t.Fatalf("reading %s: %v", name, err)
	}
	return string(body)
}

func mountedAdminRoutes(t *testing.T) map[string]string {
	t.Helper()
	found := make(map[string]string)
	for _, name := range mountFiles {
		source := readSource(t, name)
		for _, match := range adminMount.FindAllStringSubmatch(source, -1) {
			found[match[1]+" "+match[2]] = name
		}
	}
	if len(found) == 0 {
		t.Fatal("no administrative route was found in the mount files")
	}
	return found
}

func routeShape(method, path string) string {
	segments := strings.Split(path, "/")
	for i, segment := range segments {
		if strings.HasPrefix(segment, "{") {
			segments[i] = "{}"
		}
	}
	return method + " " + strings.Join(segments, "/")
}

func probedRouteShapes(t *testing.T) map[string]bool {
	t.Helper()
	source := readSource(t, rolesTableFile)
	probe := regexp.MustCompile(`http\.Method(Get|Post|Put|Patch|Delete),\s*((?:"[^"]*"|[^,
])+),`)
	shapes := make(map[string]bool)
	for _, match := range probe.FindAllStringSubmatch(source, -1) {
		shapes[routeShape(strings.ToUpper(match[1]), pathExpression(match[2]))] = true
	}
	return shapes
}

func pathExpression(expr string) string {
	var path strings.Builder
	for _, part := range strings.Split(expr, "+") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, `"`) && strings.HasSuffix(part, `"`) && len(part) >= 2 {
			path.WriteString(part[1 : len(part)-1])
			continue
		}
		path.WriteString("{}")
	}
	return path.String()
}

func TestEveryAdministrativeRouteIsProbedByTheRolesTable(t *testing.T) {
	mounted := mountedAdminRoutes(t)
	probed := probedRouteShapes(t)

	var missing []string
	for route, file := range mounted {
		parts := strings.SplitN(route, " ", 2)
		if !probed[routeShape(parts[0], parts[1])] {
			missing = append(missing, route+"  ("+file+")")
		}
	}
	sort.Strings(missing)

	if len(missing) > 0 {
		t.Fatalf("%d administrative route(s) are mounted behind rt.admin but never probed "+
			"by a participant in %s:\n\t%s",
			len(missing), rolesTableFile, strings.Join(missing, "\n\t"))
	}
}
