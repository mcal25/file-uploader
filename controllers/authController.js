import bcrypt from "bcryptjs";
import passport from "passport";
import { prisma } from "../lib/prisma.js";

export function showLogin(req, res) {
  res.render("login");
}

export function showSignup(req, res) {
  res.render("signup");
}

export async function signup(req, res, next) {
  try {
    const username = req.body.username?.trim();
    const email = req.body.email?.trim();
    const password = req.body.password;

    if (!username || !email || !password) {
      return res.status(400).send("Username, email, and password are required.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { username, email, password: hashedPassword },
    });

    res.redirect("/login");
  } catch (error) {
    next(error);
  }
}

export function login(req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })(req, res, next);
}

export function logout(req, res, next) {
  req.logout((error) => {
    if (error) return next(error);
    res.redirect("/");
  });
}
