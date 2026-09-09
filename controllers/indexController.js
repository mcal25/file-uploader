import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

export async function loadIndex(req, res) {
  res.render("index");
}

export async function loadSignup(req, res) {
  res.render("signup");
}

export async function submitSignup(req, res, next) {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    console.log("Req body:", req.body);
    await prisma.user.create({
      data: {
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
      },
    });
    res.redirect("/");
  } catch (error) {
    console.error(error);
    next(error);
  }
}

passport.use(
  new LocalStrategy(async (un, pw, done) => {
    try {
      const user = await prisma.user.findUnique({ where: username == un });
      const match = await bcrypt.compare(pw, user.password);

      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: id == user.id });
    done(null, user);
  } catch (err) {
    done(err);
  }
});
