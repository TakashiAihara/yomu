import { initTRPC, TRPCError } from "@trpc/server"
import type { Context } from "./context.js"

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" })
  return next({ ctx: { ...ctx, user: ctx.user } })
})
export const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.isAdmin) throw new TRPCError({ code: "FORBIDDEN" })
  return next({ ctx })
})
