import { useQuery } from '@tanstack/react-query'
import { catalogQuery } from '@/entities/catalog/catalog.queries'
import { teamsQuery } from '@/entities/team/team.queries'
import { matchesQuery } from '@/shared/keyboard/layout-map'
import type { PaletteMode } from './palette-prefix'

const KIND_FOR_MODE: Partial<Record<PaletteMode, 'HACKATHON' | 'MEETUP'>> = {
  hackathons: 'HACKATHON',
  meetups: 'MEETUP',
}

function useEventSearch(mode: PaletteMode, term: string) {
  const searchesEvents =
    mode === 'hackathons' || mode === 'meetups' || mode === 'events' || mode === 'smart'
  const kind = KIND_FOR_MODE[mode]

  const query = useQuery({
    ...catalogQuery({ search: term || undefined, kind, page_size: 8 }),
    enabled: searchesEvents && term.length > 0,
  })

  return {
    items: searchesEvents ? (query.data?.items ?? []) : [],
    isFetching: searchesEvents ? query.isFetching : false,
  }
}

function useTeamSearch(mode: PaletteMode, term: string) {
  const searchesTeams = mode === 'teams' || mode === 'smart'
  const query = useQuery({ ...teamsQuery(), enabled: searchesTeams })
  const teams = query.data?.items ?? []
  const filtered = term ? teams.filter((team) => matchesQuery(team.name, term)) : teams

  return {
    items: searchesTeams ? filtered : [],
    isFetching: searchesTeams ? query.isFetching : false,
  }
}

export function usePaletteSearch(mode: PaletteMode, term: string) {
  const events = useEventSearch(mode, term)
  const teams = useTeamSearch(mode, term)

  return {
    events: events.items,
    teams: teams.items,
    isSearching: events.isFetching || teams.isFetching,
  }
}
