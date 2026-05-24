import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import http from "http"
import passport from "passport"

import { ENV } from "./config/env.config"
import { errorHandler } from "./middlewares/errorHandler.middleware"
import { asyncHandler } from "./middlewares/asyncHandler.middleware"
import { HTTPSTATUS } from "./config/http.config"
import { connectDatabase } from "./config/database.config"
import router from "./routes"
import "./config/passport.config"
import { initializeSocket } from "./lib/socket"

const app = express()
// create a server using http module for socket.io
const server = http.createServer(app)

// create a socket.io instance
initializeSocket(server)

app.use(express.json({ limit: "10mb" }))
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.use(
  cors({
    origin: ENV.FRONTEND_ORIGIN,
    credentials: true,
  }),
)

app.use(passport.initialize())

app.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.status(HTTPSTATUS.OK).json({
      message: "Server is healthy",
    })
  }),
)

app.use("/api", router)

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

  server.listen(Number(ENV.PORT), () => {
    console.log(`Server running on port ${ENV.PORT} in ${ENV.NODE_ENV} mode`)
    console.log(`CORS allowed origins: ${ENV.FRONTEND_ORIGIN}`)
  })
}

startServer().catch((err) => {
  console.error("Fatal startup error:", err)
  process.exit(1)
})
