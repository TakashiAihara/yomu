import { Hono } from "hono"
import { trpcServer } from "@hono/trpc-server"
import { appRouter } from "./router/index.js"
import { createContext } from "./context.js"

const app = new Hono()

app.get("/health", (c) => c.json({ status: "ok" }))

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  }),
)

const port = Number(process.env.PORT ?? 3000)

export default {
  port,
  fetch: app.fetch,
}
