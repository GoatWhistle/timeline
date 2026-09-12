import type { NavItem } from '@/app/sidebar/nav-section'
import type { CatalogEvent, TeamResponse } from '@/shared/api/types.gen'
import { matchesQuery } from '@/shared/keyboard/layout-map'
import type { PaletteMode } from './palette-prefix'
import type { RecentEntry } from './recent-store'

export type PaletteSection = 'recent' | 'events' | 'teams' | 'pages' | 'admin' | 'commands'

export type PaletteResult = {
  id: string
  section: PaletteSection
  title: string
  hint?: string
  path?: string
  run?: () => void
}

function eventResult(event: CatalogEvent): PaletteResult {
  return {
    id: `event-${event.id}`,
    section: 'events',
    title: event.title,
    hint: event.kind === 'HACKATHON' ? '#' : '@',
    path: `/events/${event.id}`,
  }
}

function teamResult(team: TeamResponse): PaletteResult {
  return { id: `team-${team.id}`, section: 'teams', title: team.name, path: `/teams/${team.id}` }
}

function pageResult(item: NavItem, section: 'pages' | 'admin', label: string): PaletteResult {
  return { id: `${section}-${item.to}`, section, title: label, path: item.to }
}

function recentResult(entry: RecentEntry): PaletteResult {
  return { id: `recent-${entry.id}`, section: 'recent', title: entry.title, path: entry.path }
}

export function buildResults({
  mode,
  term,
  events,
  teams,
  pages,
  adminPages,
  commands,
  recent,
}: {
  mode: PaletteMode
  term: string
  events: CatalogEvent[]
  teams: TeamResponse[]
  pages: { item: NavItem; label: string }[]
  adminPages: { item: NavItem; label: string }[]
  commands: PaletteResult[]
  recent: RecentEntry[]
}): PaletteResult[] {
  if (mode === 'commands') return commands
  if (mode === 'teams') return teams.map(teamResult)
  if (mode === 'admin') {
    const filtered = term ? adminPages.filter(({ label }) => matchesQuery(label, term)) : adminPages
    return filtered.map(({ item, label }) => pageResult(item, 'admin', label))
  }
  if (mode === 'pages') {
    const filtered = term ? pages.filter(({ label }) => matchesQuery(label, term)) : pages
    return filtered.map(({ item, label }) => pageResult(item, 'pages', label))
  }
  if (mode === 'hackathons' || mode === 'meetups' || mode === 'events') {
    return events.map(eventResult)
  }

  if (term === '') return recent.map(recentResult)

  const matchedPages = pages
    .filter(({ label }) => matchesQuery(label, term))
    .map(({ item, label }) => pageResult(item, 'pages', label))
  const matchedCommands = commands.filter((command) => matchesQuery(command.title, term))
  const matchedTeams = teams.filter((team) => matchesQuery(team.name, term)).map(teamResult)

  return [...events.map(eventResult), ...matchedTeams, ...matchedPages, ...matchedCommands]
}
