import { prisma } from "../lib/prisma.js";

export async function showHome(req, res, next) {
  try {
    let stats = null;

    if (req.user) {
      const [fileCount, folderCount] = await Promise.all([
        prisma.file.count({ where: { userId: req.user.id } }),
        prisma.folder.count({ where: { userId: req.user.id } }),
      ]);

      stats = {
        fileCount,
        folderCount,
        lastLogin: req.user.lastLoginAt
          ? req.user.lastLoginAt.toLocaleString()
          : "Not recorded yet",
      };
    }

    res.render("index", { user: req.user, stats });
  } catch (error) {
    next(error);
  }
}
