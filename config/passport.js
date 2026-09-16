import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { prisma } from "../lib/prisma.js";

// Passport calls this strategy whenever a user submits the login form.
// The database stores a password hash, so the submitted password is compared
// with bcrypt instead of being compared as plain text.
export function configurePassport() {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          return done(null, false, { message: "Incorrect username or password." });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
          return done(null, false, { message: "Incorrect username or password." });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Only the user's id is stored in the session cookie. The full user is
  // loaded again by deserializeUser on later requests.
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (userId, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}
