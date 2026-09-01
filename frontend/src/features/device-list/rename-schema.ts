import { z } from 'zod'

export const renameDeviceSchema = z.object({
  label: z.string().trim().max(64, 'devices.nameTooLong'),
})

export type RenameDeviceValues = z.infer<typeof renameDeviceSchema>
