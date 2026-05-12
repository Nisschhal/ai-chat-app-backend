import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

import { ENV } from "./config/env.config"
import { errorHandler } from "./middlewares/errorHandler.middleware"
import { asyncHandler } from "./middlewares/asyncHandler.middleware"
import { HTTPSTATUS } from "./config/http.config"
import { connectDatabase } from "./config/database.config"

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.use(
  cors({
    origin: ENV.FRONTEND_ORIGIN,
    credentials: true,
  }),
)

app.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.status(HTTPSTATUS.OK).json({
      message: "Server is healthy",
    })
  }),
)

app.use((req, res) => {
  return res.status(HTTPSTATUS.NOT_FOUND).json({
    success: false,
    message: `API endpoint doesn't exist: ${req.method} ${req.originalUrl}`,
    error: {
      code: "NOT_FOUND",
    },
  })
})
app.use(errorHandler)

// ─── Start ───────────────────────────────────────────────────────────────────

async function startServer() {
  const dbConnected = await connectDatabase()

  if (!dbConnected) {
    console.error("Cannot start server: database connection failed")
    process.exit(1)
  }

  app.listen(Number(ENV.PORT), () => {
    console.log(`Server running on port ${ENV.PORT} in ${ENV.NODE_ENV} mode`)
    console.log(`CORS allowed origins: ${ENV.FRONTEND_ORIGIN}`)
  })
}

startServer().catch((err) => {
  console.error("Fatal startup error:", err)
  process.exit(1)
})
