import passport from "passport"
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt"
import { UnauthorizedException } from "./app-error"
import { ENV } from "./env.config"
import { findByIdUserService } from "@/services/user.service"

// Register JWT auth strategy once during app bootstrap.
// This strategy is invoked by `passport.authenticate("jwt")`.
passport.use(
  new JwtStrategy(
    {
      // Extract token from cookie-based auth (`accessToken`).
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const token = req.cookies.accessToken
          // Missing token means request is unauthenticated.
          if (!token) throw new UnauthorizedException("Unauthorized Access")
          return token
        },
      ]),
      // Verify signature with same secret used during token creation.
      secretOrKey: ENV.JWT_SECRET,
      // Only accept tokens that contain aud = "user".
      audience: ["user"],
      // Restrict accepted signing algorithm.
      algorithms: ["HS256"],
    },
    async ({ userId }, done) => {
      try {
        // Token is already verified here; now validate the user still exists.
        const user = userId && (await findByIdUserService(userId))
        // done(error, user): null = no internal auth error.
        // user object => success, false => unauthorized.
        return done(null, user || false)
      } catch (error) {
        // Lookup failure is treated as unauthorized for safety.
        // don't throw error here, just return false
        // for error done(error, false)
        return done(null, false)
      }
    },
  ),
)

// Reusable middleware for protected routes (stateless JWT auth).
export const passportAuthenticateJwt = passport.authenticate("jwt", {
  session: false,
})
