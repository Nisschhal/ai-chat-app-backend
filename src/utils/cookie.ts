import { ENV } from "@/config/env.config"
import { Response } from "express"
import jwt from "jsonwebtoken"

type Time = `${number}${"s" | "m" | "h" | "d" | "w" | "y"}`
type Cookie = {
  res: Response
  userId: string
}
export const setJwtAuthCookie = ({ res, userId }: Cookie) => {
  const payload = { userId }
  const expiresIn = ENV.JWT_EXPIRES_IN as Time
  const token = jwt.sign(payload, ENV.JWT_SECRET, {
    audience: ["user"],
    expiresIn: expiresIn || "7d",
  })

  return res.cookie("accessToken", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true, // only accessible by the web server
    secure: ENV.NODE_ENV === "production" ? true : false, // only send the cookie over HTTPS in production
    sameSite: ENV.NODE_ENV === "production" ? "strict" : "lax", // prevent CSRF attacks
  })
}

export const clearJwtAuthCookie = (res: Response) =>
  res.clearCookie("accessToken", { path: "/" })
