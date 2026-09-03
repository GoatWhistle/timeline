import { useQuery } from '@tanstack/react-query'
import { Plus, PowerOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CHANNEL_KEY, NOTIFICATION_TYPE_KEY } from '@/entities/notification/notification.labels'
import {
  rulesQuery,
  useCreateRule,
  useDisableRule,
  useUpdateRule,
} from '@/entities/registration/registration.queries'
import { failureMessage } from '@/shared/api/failure'
import type { Channel, NotificationRuleResponse } from '@/shared/api/types.gen'
import { formatOffsetMinutes } from '@/shared/datetime/datetime'
import { RuleFigure } from '@/shared/ui/data-display/empty-figures/system-figures'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
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
import { EditAction } from '@/shared/ui/primitives/row-actions'
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'
import { AUTO_CHANNEL, type Direction, RuleDialog } from './rule-dialog/rule-dialog'

const MAX_RULES = 10

export function RulesEditor({ eventId }: { eventId: string }) {
  const { t } = useTranslation('registration')
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

  const rules = query.data ?? []
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
        toast.success(t('rules.changed'), {
          description: t('rules.changedHint'),
        })
      } else {
        await create.mutateAsync({
          offset_minutes: offset,
          enabled: true,
          ...(channel !== AUTO_CHANNEL ? { channel_override: channel } : {}),
        })
        toast.success(t('rules.created'), { description: t('rules.createdHint') })
      }
      setOpen(false)
      setEditing(null)
    } catch (error) {
      toast.error(failureMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-copy">
          {t('rules.count', { count: rules.length, max: MAX_RULES })}
        </p>
        <Button onClick={() => openDialog(null)} disabled={limitReached}>
          <Plus className="size-4" />
          {t('rules.add')}
        </Button>
      </div>

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={3} columns={5} density="action" />}
      >
        {rules.length === 0 ? (
          <EmptyState
            title={t('rules.emptyTitle')}
            description={t('rules.emptyHint')}
            figure={RuleFigure}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t('rules.slot')}</TableHead>
                <TableHead>{t('rules.when')}</TableHead>
                <TableHead>{t('rules.type')}</TableHead>
                <TableHead>{t('rules.channel')}</TableHead>
                <TableHead className="w-40">{t('rules.enabled')}</TableHead>
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
                      {t(NOTIFICATION_TYPE_KEY[rule.type])}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.channel_override
                      ? t(CHANNEL_KEY[rule.channel_override])
                      : t('rules.defaultChannel')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EditAction
                        label={t('rules.edit', { slot: rule.slot_no })}
                        onClick={() => openDialog(rule)}
                      />
                      <Switch
                        checked={rule.enabled}
                        aria-label={t('rules.toggle', { slot: rule.slot_no })}
                        onCheckedChange={(checked) =>
                          update
                            .mutateAsync({ id: rule.id, body: { enabled: checked } })
                            .catch(() => toast.error(t('rules.changeFailed')))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('rules.disableAria', { slot: rule.slot_no })}
                        disabled={!rule.enabled || disable.isPending}
                        onClick={() =>
                          disable
                            .mutateAsync(rule.id)
                            .then(() => toast.success(t('rules.disabled')))
                            .catch(() => toast.error(t('rules.disableFailed')))
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
      </QueryBoundary>

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
