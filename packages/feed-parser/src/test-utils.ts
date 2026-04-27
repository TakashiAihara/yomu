import { mock } from "bun:test"

type MockFetchOptions = {
  status?: number
  contentType?: string
}

export function mockFetch(body: string, options: MockFetchOptions = {}) {
  const { status = 200, contentType = "application/atom+xml" } = options
  globalThis.fetch = mock(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (key: string) => (key === "content-type" ? contentType : null) },
      text: () => Promise.resolve(body),
    }),
  ) as unknown as typeof fetch
}
