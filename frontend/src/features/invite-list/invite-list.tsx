import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { invitesQuery, useCreateInvite, useRevokeInvite } from '@/entities/invite/invite.queries'
import type { InviteResponse } from '@/shared/api/types.gen'
import { formatDateTime } from '@/shared/datetime/datetime'
import { applyServerErrors } from '@/shared/forms/server-errors'
import { usePageParam } from '@/shared/hooks/use-url-filters/use-url-filters'
import { EmptyState } from '@/shared/ui/data-display/empty-state'
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
import { QueryBoundary, SkeletonTable } from '@/shared/ui/states'

const schema = z.object({ email: z.email('auth:validation.email') })
type FormValues = z.infer<typeof schema>

function inviteState(invite: InviteResponse) {
  if (invite.accepted_at) return { labelKey: 'invites.accepted', tone: 'primary' as const }
  if (invite.revoked_at) return { labelKey: 'invites.revoked', tone: 'danger' as const }
  if (Date.parse(invite.expires_at) < Date.now())
    return { labelKey: 'invites.expired', tone: 'neutral' as const }
  return { labelKey: 'invites.active', tone: 'outline' as const }
}

export function AdminInvitesPage() {
  const { t } = useTranslation()
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
      toast.success(t('invites.created'), {
        description: t('invites.createdHint'),
      })
    } catch (error) {
      applyServerErrors(error, setError, ['email'])
    }
  }

  return (
    <div>
      <PageHeader
        title={t('invites.title')}
        description={t('invites.description')}
        actions={
          <Button
            onClick={() => {
              setLink(null)
              setOpen(true)
            }}
          >
            <Plus className="size-4" />
            {t('invites.invite')}
          </Button>
        }
      />

      <QueryBoundary
        isPending={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        hasData={query.data !== undefined}
        skeleton={<SkeletonTable rows={8} columns={4} density="action" />}
      >
        {query.data?.items.length === 0 ? (
          <EmptyState title={t('invites.empty')} />
        ) : (
          <div className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>{t('invites.columnState')}</TableHead>
                  <TableHead>{t('invites.columnValidUntil')}</TableHead>
                  <TableHead className="w-32">{t('invites.columnActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.items ?? []).map((item) => {
                  const state = inviteState(item)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.email}</TableCell>
                      <TableCell>
                        <Badge tone={state.tone}>{t(state.labelKey)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(item.expires_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            Boolean(item.accepted_at) ||
                            Boolean(item.revoked_at) ||
                            revoke.isPending
                          }
                          onClick={() =>
                            revoke
                              .mutateAsync(item.id)
                              .then(() => toast.success(t('invites.revokedToast')))
                              .catch(() => toast.error(t('invites.revokeFailed')))
                          }
                        >
                          {t('invites.revoke')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {query.data && <Pagination meta={query.data.meta} onPageChange={setPage} />}
          </div>
        )}
      </QueryBoundary>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invites.newTitle')}</DialogTitle>
          </DialogHeader>

          {link ? (
            <div className="flex flex-col gap-3">
              <p className="text-copy">{t('invites.link')}</p>
              <code className="break-all rounded-md bg-muted p-3 text-caption">{link}</code>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>{t('invites.done')}</Button>
              </DialogFooter>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
              <Field
                label="Email"
                htmlFor="invite-email"
                error={errors.email?.message}
                hint={t('invites.emailHint')}
              >
                <Input
                  id="invite-email"
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </Field>
              {errors.root && (
                <p role="alert" className="text-destructive text-copy">
                  {errors.root.message}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  {t('action.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {t('event:list.create')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
