import { type AvatarRejection, rejectionFor } from './avatar-file'

export type DropOutcome = { file: File } | { rejection: AvatarRejection } | null

export function fileFromDrop(transfer: DataTransfer | null): File | null {
  if (!transfer) return null
  const items = Array.from(transfer.items ?? [])
  const fromItems = items
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .find((file): file is File => file !== null)
  if (fromItems) return fromItems
  return Array.from(transfer.files ?? [])[0] ?? null
}

export function acceptDropped(transfer: DataTransfer | null): DropOutcome {
  const file = fileFromDrop(transfer)
  if (!file) return null
  const rejection = rejectionFor(file)
  return rejection ? { rejection } : { file }
}
