import { router, authedProcedure } from "../trpc.js"

export const enclosureRouter = router({
  get: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  updateProgression: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
})
