import { router, authedProcedure } from "../trpc.js"

export const opmlRouter = router({
  export: authedProcedure.query(() => {
    throw new Error("not implemented")
  }),
  import: authedProcedure.mutation(() => {
    throw new Error("not implemented")
  }),
})
