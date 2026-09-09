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

