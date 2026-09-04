package event

import (
	"reflect"
	"testing"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
)

func requiresTracksArgument(t *testing.T, name string, ctor any) {
	t.Helper()
	want := reflect.TypeOf((*event.Tracks)(nil))
	fn := reflect.TypeOf(ctor)
	for i := range fn.NumIn() {
		if fn.In(i) == want {
			return
		}
	}
	t.Fatalf("%s does not take *event.Tracks: a required repository injected after "+
		"construction leaves it nil and silently skips track rules", name)
}

func TestEventServiceTakesTracksThroughConstructor(t *testing.T) {
	requiresTracksArgument(t, "NewEventService", NewEventService)
}

func TestQueryServiceTakesTracksThroughConstructor(t *testing.T) {
	requiresTracksArgument(t, "NewQueryService", NewQueryService)
}

func TestServicesExposeNoTracksSetter(t *testing.T) {
	for _, svc := range []any{&EventService{}, &QueryService{}} {
		typ := reflect.TypeOf(svc)
		if _, found := typ.MethodByName("WithTracks"); found {
			t.Fatalf("%s exposes WithTracks: the repository must arrive through the "+
				"constructor, not a setter that callers can forget", typ)
		}
	}
}
