export function openFilePicker(input: HTMLInputElement): boolean {
  if (input.disabled) return false

  try {
    input.click()
    return true
  } catch {
    return false
  }
}
