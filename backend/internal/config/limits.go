package config

type Personal struct {
	MaxTasksPerEvent     int
	MaxArtifactsPerEvent int
	MaxNoteLength        int
}

type ResourceLinks struct {
	MaxPerEvent         int
	MaxPersonalPerEvent int
}

func loadPersonal() Personal {
	return Personal{
		MaxTasksPerEvent:     envInt("PERSONAL_MAX_TASKS_PER_EVENT", 200),
		MaxArtifactsPerEvent: envInt("PERSONAL_MAX_ARTIFACTS_PER_EVENT", 20),
		MaxNoteLength:        envInt("PERSONAL_MAX_NOTE_LENGTH", 20000),
	}
}

func loadResourceLinks() ResourceLinks {
	return ResourceLinks{
		MaxPerEvent:         envInt("RESOURCE_LINKS_MAX_PER_EVENT", 50),
		MaxPersonalPerEvent: envInt("RESOURCE_LINKS_MAX_PERSONAL_PER_EVENT", 20),
	}
}
