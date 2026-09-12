import { useTranslation } from 'react-i18next'
import { GroupLabel } from '@/shared/ui/data-display/group-label/group-label'
import type { PaletteResult, PaletteSection } from './palette-results'
import { PaletteRow } from './palette-row'

const SECTION_LABEL_KEY: Record<PaletteSection, string> = {
  recent: 'palette.recent',
  events: 'palette.sectionEvents',
  teams: 'palette.sectionTeams',
  pages: 'palette.sectionPages',
  admin: 'palette.sectionAdmin',
  commands: 'palette.sectionCommands',
}

function groupBySection(results: PaletteResult[]): [PaletteSection, PaletteResult[]][] {
  const order: PaletteSection[] = []
  const bySection = new Map<PaletteSection, PaletteResult[]>()
  for (const result of results) {
    if (!bySection.has(result.section)) {
      bySection.set(result.section, [])
      order.push(result.section)
    }
    bySection.get(result.section)?.push(result)
  }
  return order.map((section) => [section, bySection.get(section) ?? []])
}

export function PaletteList({
  results,
  activeId,
  onHover,
  onChoose,
}: {
  results: PaletteResult[]
  activeId: string | null
  onHover: (id: string) => void
  onChoose: (result: PaletteResult) => void
}) {
  const { t } = useTranslation()
  const groups = groupBySection(results)
  const showLabels = groups.length > 1

  return (
    <>
      {groups.map(([section, items]) => (
        <div key={section} className="flex flex-col gap-0.5">
          {showLabels && (
            <GroupLabel as="p" className="px-3 py-1">
              {t(SECTION_LABEL_KEY[section])}
            </GroupLabel>
          )}
          {items.map((result) => (
            <PaletteRow
              key={result.id}
              result={result}
              active={result.id === activeId}
              onHover={() => onHover(result.id)}
              onChoose={() => onChoose(result)}
            />
          ))}
        </div>
      ))}
    </>
  )
}
