import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, PowerOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CHANNEL_LABEL, NOTIFICATION_TYPE_LABEL } from '@/entities/notification/notification.labels'
import {
  rulesQuery,
  useCreateRule,
  useDisableRule,
  useUpdateRule,
} from '@/entities/registration/registration.queries'
import type { Channel, NotificationRuleResponse } from '@/shared/api/types.gen'
import { formatOffsetMinutes } from '@/shared/datetime/datetime'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
import { ErrorState } from '@/shared/ui/data-display/error-state'
import { LoadingState } from '@/shared/ui/data-display/loading-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/data-display/table'
import { Switch } from '@/shared/ui/forms/switch'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { AUTO_CHANNEL, type Direction, RuleDialog } from './rule-dialog/rule-dialog'

const MAX_RULES = 10

export function RulesEditor({ eventId }: { eventId: string }) {
  const query = useQuery(rulesQuery(eventId))
  const create = useCreateRule(eventId)
  const update = useUpdateRule(eventId)
  const disable = useDisableRule(eventId)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationRuleResponse | null>(null)
  const [direction, setDirection] = useState<Direction>('before')
  const [days, setDays] = useState('1')
  const [hours, setHours] = useState('0')
  const [channel, setChannel] = useState<Channel | typeof AUTO_CHANNEL>(AUTO_CHANNEL)

  function openDialog(rule: NotificationRuleResponse | null) {
    setEditing(rule)
    if (rule) {
      const magnitude = Math.abs(rule.offset_minutes)
      setDirection(rule.offset_minutes < 0 ? 'after' : 'before')
      setDays(String(Math.floor(magnitude / 1440)))
      setHours(String(Math.floor((magnitude % 1440) / 60)))
      setChannel(rule.channel_override ?? AUTO_CHANNEL)
    } else {
      setDirection('before')
      setDays('1')
      setHours('0')
      setChannel(AUTO_CHANNEL)
    }
    setOpen(true)
  }

  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const rules = query.data
  const limitReached = rules.length >= MAX_RULES

  async function submit() {
    const magnitude = Number(days) * 1440 + Number(hours) * 60
    const offset = direction === 'before' ? magnitude : -magnitude
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          body: {
            offset_minutes: offset,
            channel_override: channel === AUTO_CHANNEL ? undefined : channel,
          },
        })
        toast.success('Правило изменено', {
          description: 'Изменение расписания пересоздаёт запланированные уведомления',
        })
      } else {
        await create.mutateAsync({
          offset_minutes: offset,
          enabled: true,
          ...(channel !== AUTO_CHANNEL ? { channel_override: channel } : {}),
        })
        toast.success('Правило создано', { description: 'Расписание уведомлений пересчитано' })
      }
      setOpen(false)
      setEditing(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить правило')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Правил: {rules.length} из {MAX_RULES}
        </p>
        <Button onClick={() => openDialog(null)} disabled={limitReached}>
          <Plus className="size-4" />
          Добавить правило
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          title="Правил напоминаний нет"
          description="Без правил участники получат только первичное уведомление"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Слот</TableHead>
              <TableHead>Когда</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Канал</TableHead>
              <TableHead className="w-40">Включено</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="text-muted-foreground">{rule.slot_no}</TableCell>
                <TableCell className="font-medium">
                  {formatOffsetMinutes(rule.offset_minutes)}
                </TableCell>
                <TableCell>
                  <Badge tone={rule.offset_minutes < 0 ? 'danger' : 'neutral'}>
                    {NOTIFICATION_TYPE_LABEL[rule.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rule.channel_override ? CHANNEL_LABEL[rule.channel_override] : 'по умолчанию'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Изменить правило слота ${rule.slot_no}`}
                      onClick={() => openDialog(rule)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Switch
                      checked={rule.enabled}
                      aria-label={`Правило слота ${rule.slot_no}`}
                      onCheckedChange={(checked) =>
                        update
                          .mutateAsync({ id: rule.id, body: { enabled: checked } })
                          .catch(() => toast.error('Не удалось изменить правило'))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Выключить правило слота ${rule.slot_no}`}
                      disabled={!rule.enabled || disable.isPending}
                      onClick={() =>
                        disable
                          .mutateAsync(rule.id)
                          .then(() => toast.success('Правило выключено'))
                          .catch(() => toast.error('Не удалось выключить правило'))
                      }
                    >
                      <PowerOff className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RuleDialog
        open={open}
        isEditing={editing !== null}
        direction={direction}
        days={days}
        hours={hours}
        channel={channel}
        pending={create.isPending || update.isPending}
        onOpenChange={setOpen}
        onDirectionChange={setDirection}
        onDaysChange={setDays}
        onHoursChange={setHours}
        onChannelChange={setChannel}
        onCancel={() => setOpen(false)}
        onSubmit={submit}
      />
    </div>
  )
}
