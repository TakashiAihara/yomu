import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"

export type AuthUser = {
  id: number
  username: string
  isAdmin: boolean
}

export type Context = {
  user: AuthUser | null
}

export function createContext(_opts: FetchCreateContextFnOptions): Context {
  // TODO: Google OAuth / API key 認証を実装
  return { user: null }
}
