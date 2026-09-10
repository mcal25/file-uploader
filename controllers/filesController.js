import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer from "multer";

const upload = multer({ dest: "../uploads/" });

export async function loadFiles(req, res, next) {
  const folders = await prisma.folder.findMany();
  console.log(folders);
  res.render("files", {folders: folders});
}
