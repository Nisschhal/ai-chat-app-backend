import { ErrorRequestHandler, Request, Response } from "express"
import { HTTPSTATUS } from "../config/http.config"
import { AppError } from "../config/app-error"

// ErrorRequestHandler is a type that is used to handle errors in the request
// If not used then specify the types of err, req, res, next
// like this: (err: Error, req: Request, res: Response, next: NextFunction): any => {}

export const errorHandler: ErrorRequestHandler = (err, req, res, next): any => {
  console.log(`Error occured: ${req.path} ${err}`)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      error: err.errorCode,
    })
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: err.message || "Something went wrong",
  })
}
