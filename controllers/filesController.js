import { prisma } from "../lib/prisma.js";
import { removeStoredFile, removeUploadedFiles } from "../lib/fileStorage.js";
import { parseId } from "../lib/validation.js";

function redirectToFolder(res, folderId) {
  const location = folderId === null ? "/folders" : `/folders?folderId=${folderId}`;
  res.redirect(location);
}

async function findOwnedFolder(folderId, userId) {
  if (folderId === null) return true;

  return prisma.folder.findFirst({
    where: { id: folderId, userId },
    select: { id: true },
  });
}

async function getOrCreateFolderPath(db, relativePath, startingFolderId, userId, folderCache) {
  // A dropped folder arrives as a path such as "Photos/2026/image.jpg".
  // We create or reuse each folder in that path, from left to right.
  const folderNames = relativePath.split("/").filter(Boolean).slice(0, -1);
  let parentId = startingFolderId;

  for (const folderName of folderNames) {
    const cacheKey = `${parentId ?? "root"}/${folderName}`;
    if (folderCache.has(cacheKey)) {
      parentId = folderCache.get(cacheKey);
      continue;
    }

    let folder = await db.folder.findFirst({
      where: { name: folderName, parentId, userId },
      select: { id: true },
    });

    if (!folder) {
      folder = await db.folder.create({
        data: { name: folderName, parentId, userId },
        select: { id: true },
      });
    }

    parentId = folder.id;
    folderCache.set(cacheKey, parentId);
  }

  return parentId;
}

export async function uploadFiles(req, res, next) {
  try {
    const files = req.files || [];
    const folderId = parseId(req.body.folderId);

    if (!files.length) {
      return res.status(400).send("At least one file is required.");
    }

    if (req.body.folderId && folderId === null) {
      await removeUploadedFiles(files);
      return res.status(400).send("A valid folder is required.");
    }

    if (!(await findOwnedFolder(folderId, req.user.id))) {
      await removeUploadedFiles(files);
      return res.status(404).send("Folder not found.");
    }

    const relativePaths = Array.isArray(req.body.relativePaths)
      ? req.body.relativePaths
      : [req.body.relativePaths];
    const folderCache = new Map();

    await prisma.$transaction(async (db) => {
      for (const [index, file] of files.entries()) {
        const relativePath = relativePaths[index] || file.originalname;
        const destinationFolderId = await getOrCreateFolderPath(
          db,
          relativePath,
          folderId,
          req.user.id,
          folderCache
        );

        await db.file.create({
          data: {
            name: file.originalname,
            link: `/uploads/${file.filename}`,
            size: file.size,
            userId: req.user.id,
            folderId: destinationFolderId,
          },
        });
      }
    });

    // The browser upload uses fetch and reloads the page itself. A normal HTML
    // form still gets the simpler redirect behavior.
    if (req.get("X-Requested-With") === "fetch") {
      return res.json({ uploaded: files.length });
    }

    redirectToFolder(res, folderId);
  } catch (error) {
    await removeUploadedFiles(req.files);
    next(error);
  }
}

export async function renameFile(req, res, next) {
  try {
    const fileId = parseId(req.params.id);
    const name = req.body.name?.trim();

    if (!Number.isInteger(fileId) || !name) {
      return res.status(400).send("A valid file id and name are required.");
    }

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId: req.user.id },
    });

    if (!file) return res.status(404).send("File not found.");

    await prisma.file.update({
      where: { id: fileId },
      data: { name },
    });

    redirectToFolder(res, file.folderId);
  } catch (error) {
    next(error);
  }
}

export async function deleteFile(req, res, next) {
  try {
    const fileId = parseId(req.params.id);
    if (!Number.isInteger(fileId)) {
      return res.status(400).send("A valid file id is required.");
    }

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId: req.user.id },
    });

    if (!file) return res.status(404).send("File not found.");

    await prisma.file.delete({ where: { id: fileId } });
    await removeStoredFile(file.link);
    redirectToFolder(res, file.folderId);
  } catch (error) {
    next(error);
  }
}
