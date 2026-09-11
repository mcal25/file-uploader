import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer from "multer";

const upload = multer({ dest: "../uploads/" });

export async function loadFiles(req, res, next) {
    const currentFolderId = req.query.folderId ? parseInt(req.query.folderId) : null;
    const userId = req.user.id;

    const folders = await prisma.folder.findMany({
      where: { userId: userId, parentId: currentFolderId }
    });

    const files = await prisma.file.findMany({
      where: { userId: userId, folderId: currentFolderId }
    });

    const breadcrumbs = [];
    let searchId = currentFolderId;

    while (searchId !== null) {
      const folder = await prisma.folder.findUnique({
        where: { id: searchId },
        select: { id: true, name: true, parentId: true }
      });

      if (!folder) break;

      breadcrumbs.push(folder);
      searchId = folder.parentId;
    }

    breadcrumbs.reverse();

    res.render("files", { 
      folders, 
      files, 
      breadcrumbs, 
      currentFolderId 
    });
}