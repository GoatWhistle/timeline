import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, PowerOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Channel, NotificationRuleResponse } from '@/shared/api/types.gen'
import { formatOffsetMinutes } from '@/shared/lib/datetime'
import { CHANNEL_LABEL, NOTIFICATION_TYPE_LABEL } from '@/shared/lib/enums'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/states'
import { Switch } from '@/shared/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { rulesQuery, useCreateRule, useDisableRule, useUpdateRule } from './api'

const MAX_RULES = 10
const AUTO_CHANNEL = 'AUTO'

type Direction = 'before' | 'after'

/** Правила напоминаний. Знак смещения задаётся направлением, а не минусом в поле. */
export function RulesEditor({ hackathonId }: { hackathonId: string }) {
  const query = useQuery(rulesQuery(hackathonId))
  const create = useCreateRule(hackathonId)
  const update = useUpdateRule(hackathonId)
  const disable = useDisableRule(hackathonId)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<NotificationRuleResponse | null>(null)
  const [direction, setDirection] = useState<Direction>('before')
  const [days, setDays] = useState('1')
  const [hours, setHours] = useState('0')
  const [channel, setChannel] = useState<Channel | typeof AUTO_CHANNEL>(AUTO_CHANNEL)

  /** Открывает диалог создания или правки, раскладывая смещение на знак и величину. */
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
            // Пустое значение снимает переопределение канала.
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Изменение правила' : 'Новое правило напоминания'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field label="Направление" htmlFor="rule-direction">
              <Select value={direction} onValueChange={(value) => setDirection(value as Direction)}>
                <SelectTrigger id="rule-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">до дедлайна — напоминание</SelectItem>
                  <SelectItem value="after">после дедлайна — уведомление о просрочке</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Дней" htmlFor="rule-days">
                <Input
                  id="rule-days"
                  type="number"
                  min={0}
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                />
              </Field>
              <Field label="Часов" htmlFor="rule-hours">
                <Input
                  id="rule-hours"
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                />
              </Field>
            </div>

            <Field
              label="Канал"
              htmlFor="rule-channel"
              hint="По умолчанию канал выбирается настройками пользователя"
            >
              <Select
                value={channel}
                onValueChange={(value) => setChannel(value as Channel | typeof AUTO_CHANNEL)}
              >
                <SelectTrigger id="rule-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_CHANNEL}>По умолчанию</SelectItem>
                  {(Object.keys(CHANNEL_LABEL) as Channel[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {CHANNEL_LABEL[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <p className="rounded-md border border-dashed p-3 text-sm">
              Правило сработает:{' '}
              {formatOffsetMinutes(
                (direction === 'before' ? 1 : -1) * (Number(days) * 1440 + Number(hours) * 60),
              )}
              .
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={create.isPending || update.isPending}>
              {editing ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
