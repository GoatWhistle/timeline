import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { catalogQuery } from '@/entities/catalog/catalog.queries'
import { teamsQuery } from '@/entities/team/team.queries'
import type { CatalogEvent, TeamResponse } from '@/shared/api/types.gen'
import { matchesQuery } from '@/shared/keyboard/layout-map'
import type { PaletteMode } from './palette-prefix'

const EMPTY_EVENTS: CatalogEvent[] = []
const EMPTY_TEAMS: TeamResponse[] = []

const KIND_FOR_MODE: Partial<Record<PaletteMode, 'HACKATHON' | 'MEETUP'>> = {
  hackathons: 'HACKATHON',
  meetups: 'MEETUP',
}

function useEventSearch(mode: PaletteMode, term: string) {
  const searchesEvents =
    mode === 'hackathons' || mode === 'meetups' || mode === 'events' || mode === 'smart'
  const kind = KIND_FOR_MODE[mode]

  const browsing = mode === 'hackathons' || mode === 'meetups' || mode === 'events'

  const query = useQuery({
    ...catalogQuery({ search: term || undefined, kind, page_size: 8 }),
    enabled: searchesEvents && (browsing || term.length > 0),
  })

  const items = useMemo(
    () => (searchesEvents ? (query.data?.items ?? EMPTY_EVENTS) : EMPTY_EVENTS),
    [searchesEvents, query.data],
  )

  return { items, isFetching: searchesEvents ? query.isFetching : false }
}

function useTeamSearch(mode: PaletteMode, term: string) {
  const searchesTeams = mode === 'teams' || mode === 'smart'
  const query = useQuery({ ...teamsQuery(), enabled: searchesTeams })
  const items = useMemo(() => {
    if (!searchesTeams) return EMPTY_TEAMS
    const teams = query.data?.items ?? EMPTY_TEAMS
    return term ? teams.filter((team) => matchesQuery(team.name, term)) : teams
  }, [searchesTeams, query.data, term])

  return { items, isFetching: searchesTeams ? query.isFetching : false }
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
