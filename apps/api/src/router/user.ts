import { router, authedProcedure, adminProcedure } from "../trpc.js"

export const userRouter = router({
  me: authedProcedure.query(({ ctx }) => ctx.user),
  list: adminProcedure.query(() => {
    throw new Error("not implemented")
  }),
  create: adminProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  update: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  remove: adminProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
  markAllAsRead: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
})
