export const personalKeys = {
  tasks: (eventId: string) => ['personal-tasks', eventId] as const,
  templates: () => ['personal-templates'] as const,
  note: (eventId: string) => ['personal-note', eventId] as const,
  artifacts: (eventId: string) => ['personal-artifacts', eventId] as const,
  outcome: (eventId: string) => ['personal-outcome', eventId] as const,
  retrospective: (eventId: string) => ['personal-retrospective', eventId] as const,
  history: (params: Record<string, unknown>) => ['personal-history', params] as const,
}
