import { Lock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StageResponse } from '@/shared/api/types.gen'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/layout/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/navigation/tabs'
import { ArtifactPanel } from '../artifacts/artifact-panel'
import { NotePanel } from '../note/note-panel'
import { OutcomePanel } from '../outcome/outcome-panel'
import { RetroPanel } from '../retro/retro-panel'
import { TaskPanel } from '../tasks/task-panel'

const TABS = ['tasks', 'note', 'artifacts', 'outcome', 'retro'] as const

type PersonalTab = (typeof TABS)[number]

const TAB_LABEL: Record<PersonalTab, string> = {
  tasks: 'personal.tabTasks',
  note: 'personal.tabNote',
  artifacts: 'personal.tabArtifacts',
  outcome: 'personal.tabOutcome',
  retro: 'personal.tabRetro',
}

export const PERSONAL_SECTION_ID = 'personal-layer'

export function PersonalSection({ eventId, stages }: { eventId: string; stages: StageResponse[] }) {
  const { t } = useTranslation('event')
  const [tab, setTab] = useState<PersonalTab>('tasks')

  return (
    <Card id={PERSONAL_SECTION_ID}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
          {t('personal.title')}
        </CardTitle>
        <p className="text-meta text-muted-foreground">{t('personal.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(next) => setTab(next as PersonalTab)}>
          <div className="max-w-full overflow-x-auto">
            <TabsList>
              {TABS.map((name) => (
                <TabsTrigger key={name} value={name}>
                  {t(TAB_LABEL[name])}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="tasks">
            <TaskPanel eventId={eventId} stages={stages} />
          </TabsContent>
          <TabsContent value="note">
            <NotePanel eventId={eventId} />
          </TabsContent>
          <TabsContent value="artifacts">
            <ArtifactPanel eventId={eventId} />
          </TabsContent>
          <TabsContent value="outcome">
            <OutcomePanel eventId={eventId} />
          </TabsContent>
          <TabsContent value="retro">
            <RetroPanel eventId={eventId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
