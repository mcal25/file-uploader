import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

export async function loadIndex(req, res) {
  console.log("passport object:", req.user);
  res.render("index", { user: req.user });
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

export async function loadLogin(req, res) {
  res.render("login");
}

export async function submitLogin(req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/",
    // failureRedirect: "/login",
    // failureMessage: true,
  })(req, res, next);
}

export async function doLogout(req, res, next) {
  req.logout((err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  }));
}

export async function loadFiles(req, res, next) {
  res.render('files');
}

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username: username },
      });
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});
