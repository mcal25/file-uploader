import { prisma } from "../lib/prisma.js";
import multer from "multer";
import crypto from "crypto";
import path from "node:path";
import { unlink } from "node:fs/promises";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(2, function (err, raw) {
      if (err) return cb(err);
      cb(null, raw.toString('hex') + '-' + file.originalname);
    });
  }
});

export const upload = multer({ storage });

function getItemModel(itemType) {
  return itemType === 'folders' ? prisma.folder :
    itemType === 'files' ? prisma.file : null;
}

function redirectToFolder(res, folderId) {
  res.redirect(folderId === null ? '/folders' : `/folders?folderId=${folderId}`);
}

function redirectToContainingFolder(res, item) {
  const folderId = item.parentId !== undefined ? item.parentId : item.folderId;
  redirectToFolder(res, folderId);
}

async function removeUploadedFile(link) {
  if (!link?.startsWith('/uploads/')) return;

  try {
    await unlink(path.join('uploads', path.basename(link)));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function removeUploadedFilesFromRequest(req) {
  for (const file of req.files || []) {
    await removeUploadedFile(`/uploads/${file.filename}`);
  }
}

export async function handleUpload(req, res, next) {
  try {
    if (!req.files?.length) {
      return res.status(400).send("At least one file is required.");
    }

    const folderId = req.body.folderId ? Number.parseInt(req.body.folderId, 10) : null;

    if (folderId !== null && !Number.isInteger(folderId)) {
      await removeUploadedFilesFromRequest(req);
      return res.status(400).send('A valid folder is required.');
    }

    if (folderId !== null) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId: req.user.id },
        select: { id: true }
      });

      if (!folder) {
        await removeUploadedFilesFromRequest(req);
        return res.status(404).send('Folder not found.');
      }
    }

    const relativePaths = Array.isArray(req.body.relativePaths)
      ? req.body.relativePaths
      : [req.body.relativePaths];
    const folderCache = new Map();

    async function getFolderId(relativePath) {
      const parts = relativePath.split('/').filter(Boolean).slice(0, -1);
      let parentId = folderId;

      for (const part of parts) {
        const cacheKey = `${parentId ?? 'root'}/${part}`;
        if (folderCache.has(cacheKey)) {
          parentId = folderCache.get(cacheKey);
          continue;
        }

        let folder = await prisma.folder.findFirst({
          where: { name: part, parentId, userId: req.user.id },
          select: { id: true }
        });

        if (!folder) {
          folder = await prisma.folder.create({
            data: { name: part, parentId, userId: req.user.id },
            select: { id: true }
          });
        }

        parentId = folder.id;
        folderCache.set(cacheKey, parentId);
      }

      return parentId;
    }

    for (const [index, file] of req.files.entries()) {
      const relativePath = relativePaths[index] || file.originalname;
      await prisma.file.create({
        data: {
          name: file.originalname,
          link: `/uploads/${file.filename}`,
          size: file.size,
          userId: req.user.id,
          folderId: await getFolderId(relativePath)
        }
      });
    }

    if (req.accepts('html')) {
      redirectToFolder(res, folderId);
    } else {
      res.json({ uploaded: req.files.length });
    }
  } catch (error) {
    await removeUploadedFilesFromRequest(req);
    next(error);
  }
}

export async function createFolder(req, res, next) {
  try {
    const name = req.body.name?.trim();
    const parentId = req.body.parentId ? Number.parseInt(req.body.parentId, 10) : null;

    if (!name || (parentId !== null && !Number.isInteger(parentId))) {
      return res.status(400).send('A valid folder name and parent are required.');
    }

    if (parentId !== null) {
      const parentFolder = await prisma.folder.findFirst({
        where: { id: parentId, userId: req.user.id },
        select: { id: true }
      });

      if (!parentFolder) {
        return res.status(404).send('Parent folder not found.');
      }
    }

    await prisma.folder.create({
      data: {
        name,
        parentId,
        userId: req.user.id
      }
    });

    redirectToFolder(res, parentId);
  } catch (error) {
    next(error);
  }
}

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

    res.render("folders", { 
      folders, 
      files, 
      breadcrumbs, 
      currentFolderId 
    });
}

export async function renameItem(req, res, next) {
  try {
    const itemId = Number.parseInt(req.params.id, 10);
    const name = req.body.name?.trim();

    if (!Number.isInteger(itemId) || !name) {
      return res.status(400).send('A valid item id and name are required.');
    }

    const model = getItemModel(req.params.itemType);
    if (!model) {
      return res.status(404).send('Item type not found.');
    }

    const item = await model.findFirst({
      where: { id: itemId, userId: req.user.id }
    });

    if (!item) {
      return res.status(404).send('Item not found.');
    }

    await model.update({
      where: { id: itemId },
      data: { name }
    });

    redirectToContainingFolder(res, item);
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const itemId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(itemId)) {
      return res.status(400).send('A valid item id is required.');
    }

    const model = getItemModel(req.params.itemType);
    if (!model) {
      return res.status(404).send('Item type not found.');
    }

    const item = await model.findFirst({
      where: { id: itemId, userId: req.user.id }
    });

    if (!item) {
      return res.status(404).send('Item not found.');
    }

    await model.delete({ where: { id: itemId } });

    if (req.params.itemType === 'files') {
      await removeUploadedFile(item.link);
    }

    redirectToContainingFolder(res, item);
  } catch (error) {
    next(error);
  }
}