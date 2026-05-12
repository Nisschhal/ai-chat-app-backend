import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

import { ENV } from "./config/env.config"
import { errorHandler } from "./middlewares/errorHandler.middleware"
import { asyncHandler } from "./middlewares/asyncHandler.middleware"
import { HTTPSTATUS } from "./config/http.config"

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

app.use(errorHandler)

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT} in ${ENV.NODE_ENV} mode`)
})
