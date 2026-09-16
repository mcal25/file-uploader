import { Router } from "express";
import { showHome } from "../controllers/homeController.js";
import { login, logout, showLogin, showSignup, signup } from "../controllers/authController.js";

export const indexRouter = Router();

indexRouter.get("/", showHome);

indexRouter.get("/signup", showSignup);
indexRouter.post("/signup", signup);

indexRouter.get("/login", showLogin);
indexRouter.post("/login", login);

indexRouter.get("/logout", logout);