import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import path from "node:path"
import { fileURLToPath } from 'node:url';
import bcrypt from "bcryptjs";
import session from 'express-session';
import passport from 'passport';
import { Strategy } from 'passport-local';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { indexRouter } from './routes/indexRouter.js';
import { foldersRouter } from './routes/foldersRouter.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

app.use(
  session({
    cookie: {
     maxAge: 7 * 24 * 60 * 60 * 1000 // ms
    },
    secret: 'a santa at nasa',
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    )
  })
);
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));

app.use('/styles', express.static('styles')); 
app.use('/scripts', express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use('/', indexRouter);
app.use('/folders', foldersRouter);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use((req, res, next) => {
    res.locals.currentUser = req.user
    next();
});

app.listen(3000, (error) => {
    if (error) {
        throw error;
    }
    console.log('Listening on port 3000');
});