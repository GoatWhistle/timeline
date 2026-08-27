import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { invitesQuery, useCreateInvite, useRevokeInvite } from '@/entities/invite/invite.queries'
import type { InviteResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { usePageParam } from '@/shared/hooks/use-url-filters/use-url-filters'
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
import { Field } from '@/shared/ui/forms/field'
import { Input } from '@/shared/ui/forms/input'
import { PageHeader } from '@/shared/ui/layout/page-header'
import { Pagination } from '@/shared/ui/navigation/pagination'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/overlays/dialog'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'

const schema = z.object({ email: z.email('Укажите корректный адрес') })
type FormValues = z.infer<typeof schema>

function inviteState(invite: InviteResponse) {
  if (invite.accepted_at) return { label: 'принято', tone: 'primary' as const }
  if (invite.revoked_at) return { label: 'отозвано', tone: 'danger' as const }
  if (Date.parse(invite.expires_at) < Date.now())
    return { label: 'истекло', tone: 'neutral' as const }
  return { label: 'активно', tone: 'outline' as const }
}

export function AdminInvitesPage() {
  const [page, setPage] = usePageParam()
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)

  const query = useQuery(invitesQuery(page))
  const create = useCreateInvite()
  const revoke = useRevokeInvite()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  async function submit(values: FormValues) {
    try {
      const result = await create.mutateAsync(values)
      setLink(result.accept_link)
      reset()
      toast.success('Приглашение создано', {
        description: 'Предыдущее непринятое приглашение на этот адрес отозвано',
      })
    } catch (error) {
      applyServerErrors(error, setError, ['email'])
    }
  }

  return (
    <div>
      <PageHeader
        title="Приглашения"
        description="Приглашение действует 72 часа и не создаёт учётную запись до завершения регистрации"
        actions={
          <Button
            onClick={() => {
              setLink(null)
              setOpen(true)
            }}
          >
            <Plus className="size-4" />
            Пригласить
          </Button>
        }
      />

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} onRetry={() => query.refetch()} />}

      {query.data && query.data.items.length === 0 && <EmptyState title="Приглашений нет" />}

      {query.data && query.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Состояние</TableHead>
                <TableHead>Действует до</TableHead>
                <TableHead className="w-32">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((item) => {
                const state = inviteState(item)
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.email}</TableCell>
                    <TableCell>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(item.expires_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          Boolean(item.accepted_at) || Boolean(item.revoked_at) || revoke.isPending
                        }
                        onClick={() =>
                          revoke
                            .mutateAsync(item.id)
                            .then(() => toast.success('Приглашение отозвано'))
                            .catch(() => toast.error('Не удалось отозвать'))
                        }
                      >
                        Отозвать
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <Pagination meta={query.data.meta} onPageChange={setPage} />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новое приглашение</DialogTitle>
          </DialogHeader>

          {link ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">Ссылка для приглашённого:</p>
              <code className="break-all rounded-md bg-muted p-3 text-xs">{link}</code>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Готово</Button>
              </DialogFooter>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
              <Field
                label="Email"
                htmlFor="invite-email"
                error={errors.email?.message}
                hint="Адрес существующего пользователя будет отклонён"
              >
                <Input
                  id="invite-email"
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </Field>
              {errors.root && (
                <p role="alert" className="text-destructive text-sm">
                  {errors.root.message}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Создать
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
