import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import session from "express-session";
import passport from "passport";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { configurePassport } from "./config/passport.js";
import { prisma } from "./lib/prisma.js";
import { indexRouter } from "./routes/indexRouter.js";
import { foldersRouter } from "./routes/foldersRouter.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configurePassport();

app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    // Set SESSION_SECRET in .env for real deployments. The fallback keeps a
    // fresh local checkout runnable while making the limitation explicit.
    secret: process.env.SESSION_SECRET || "development-only-session-secret",
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));

app.use("/styles", express.static(path.join(__dirname, "styles")));
app.use("/scripts", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use("/", indexRouter);
app.use("/folders", foldersRouter);

// This error handler keeps unexpected server errors from becoming an
// unhelpful blank response while still logging the useful stack trace.
app.use((error, req, res, next) => {
  console.error(`Error handling ${req.method} ${req.originalUrl}:`, error);
  res.status(500).send("Something went wrong.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});