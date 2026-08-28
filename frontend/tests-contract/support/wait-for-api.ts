const BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:55480/api/v1'

export async function waitForApi(attempts = 60, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/healthz`)
      if (response.ok) return
    } catch {
      void attempt
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  throw new Error(
    `the API at ${BASE_URL} did not become ready: bring the stack up with \`make test-contract\``,
  )
}
