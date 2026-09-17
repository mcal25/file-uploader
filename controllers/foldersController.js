import { ZipArchive } from "archiver";

import { prisma } from "../lib/prisma.js";
import { getStoredFilePath, removeStoredFile } from "../lib/fileStorage.js";
import { parseId } from "../lib/validation.js";

function redirectToFolder(res, folderId) {
  const location = folderId === null ? "/folders" : `/folders?folderId=${folderId}`;
  res.redirect(location);
}

async function findOwnedFolder(folderId, userId) {
  if (folderId === null) return null;

  return prisma.folder.findFirst({
    where: { id: folderId, userId },
    select: { id: true, name: true, parentId: true },
  });
}

export async function showFolder(req, res, next) {
  try {
    const currentFolderId = parseId(req.query.folderId);

    if (req.query.folderId && currentFolderId === null) {
      return res.status(400).send("A valid folder id is required.");
    }

    // Checking the folder first prevents a user from browsing another user's
    // folder simply by changing the query-string id.
    if (currentFolderId !== null) {
      const currentFolder = await findOwnedFolder(currentFolderId, req.user.id);
      if (!currentFolder) return res.status(404).send("Folder not found.");
    }

    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { userId: req.user.id, parentId: currentFolderId },
        orderBy: { name: "asc" },
      }),
      prisma.file.findMany({
        where: { userId: req.user.id, folderId: currentFolderId },
        orderBy: { name: "asc" },
      }),
    ]);

    // console.log(files);

    const breadcrumbs = [];
    let folder = currentFolderId === null
      ? null
      : await findOwnedFolder(currentFolderId, req.user.id);

    // Follow parentId upward to build the breadcrumb trail, then reverse it
    // so the page can render Root -> Parent -> Current.
    while (folder) {
      breadcrumbs.unshift(folder);
      folder = folder.parentId === null
        ? null
        : await findOwnedFolder(folder.parentId, req.user.id);
    }
    // console.log(files);
    res.render("folders", {
      folders,
      files,
      breadcrumbs,
      currentFolderId,
      user: req.user,
    });
    console.log(files);
    // Object.values()
  } catch (error) {
    next(error);
  }
}

export async function createFolder(req, res, next) {
  try {
    const name = req.body.name?.trim();
    const parentId = parseId(req.body.parentId);

    if (!name || (req.body.parentId && parentId === null)) {
      return res.status(400).send("A valid folder name and parent are required.");
    }

    if (parentId !== null && !(await findOwnedFolder(parentId, req.user.id))) {
      return res.status(404).send("Parent folder not found.");
    }

    await prisma.folder.create({
      data: { name, parentId, userId: req.user.id },
    });

    redirectToFolder(res, parentId);
  } catch (error) {
    next(error);
  }
}

export async function renameFolder(req, res, next) {
  try {
    const folderId = parseId(req.params.id);
    const name = req.body.name?.trim();

    if (!Number.isInteger(folderId) || !name) {
      return res.status(400).send("A valid folder id and name are required.");
    }

    const folder = await findOwnedFolder(folderId, req.user.id);
    if (!folder) return res.status(404).send("Folder not found.");

    await prisma.folder.update({
      where: { id: folderId },
      data: { name },
    });

    redirectToFolder(res, folder.parentId);
  } catch (error) {
    next(error);
  }
}

export async function downloadFolder(req, res, next) {
  try {
    const folderId = parseId(req.params.id);
    if (!Number.isInteger(folderId)) {
      return res.status(400).send("A valid folder id is required.");
    }

    const folder = await findOwnedFolder(folderId, req.user.id);
    if (!folder) return res.status(404).send("Folder not found.");

    const folders = await prisma.folder.findMany({
      where: { userId: req.user.id },
      select: { id: true, name: true, parentId: true },
    });
    const descendantIds = findDescendantIds(folderId, folders);
    const files = await prisma.file.findMany({
      where: { userId: req.user.id, folderId: { in: [...descendantIds] } },
      select: { name: true, link: true, folderId: true },
    });
    const folderById = new Map(folders.map((item) => [item.id, item]));
    const archive = new ZipArchive();

    res.attachment(`${folder.name}.zip`);
    archive.on("error", (error) => {
      if (res.headersSent) return res.destroy(error);
      next(error);
    });
    archive.pipe(res);

    for (const descendantId of descendantIds) {
      archive.append(Buffer.alloc(0), { name: `${getArchivePath(descendantId, folderId, folderById)}/` });
    }

    for (const file of files) {
      const filePath = getStoredFilePath(file.link);
      if (!filePath) continue;

      archive.file(filePath, {
        name: `${getArchivePath(file.folderId, folderId, folderById)}/${file.name}`,
      });
    }

    return archive.finalize();
  } catch (error) {
    next(error);
  }
}

export async function deleteFolder(req, res, next) {
  try {
    const folderId = parseId(req.params.id);
    if (!Number.isInteger(folderId)) {
      return res.status(400).send("A valid folder id is required.");
    }

    const folder = await findOwnedFolder(folderId, req.user.id);
    if (!folder) return res.status(404).send("Folder not found.");

    // Prisma cascades the database delete to child folders and files. We still
    // collect their links first because database cascades cannot delete files
    // that live on the local filesystem.
    const allFolders = await prisma.folder.findMany({
      where: { userId: req.user.id },
      select: { id: true, parentId: true },
    });
    const descendantIds = findDescendantIds(folderId, allFolders);

    const files = await prisma.file.findMany({
      where: { userId: req.user.id, folderId: { in: [...descendantIds] } },
      select: { link: true },
    });

    await prisma.folder.delete({ where: { id: folderId } });
    for (const file of files) {
      await removeStoredFile(file.link);
    }

    redirectToFolder(res, folder.parentId);
  } catch (error) {
    next(error);
  }
}

function findDescendantIds(folderId, folders) {
  const descendantIds = new Set([folderId]);
  const foldersToVisit = [folderId];

  while (foldersToVisit.length) {
    const parentId = foldersToVisit.pop();

    for (const folder of folders) {
      if (folder.parentId === parentId && !descendantIds.has(folder.id)) {
        descendantIds.add(folder.id);
        foldersToVisit.push(folder.id);
      }
    }
  }

  return descendantIds;
}

function getArchivePath(folderId, rootFolderId, foldersById) {
  const path = [];
  let currentId = folderId;

  while (currentId !== null) {
    const folder = foldersById.get(currentId);
    if (!folder) break;

    path.unshift(folder.name);
    if (currentId === rootFolderId) break;
    currentId = folder.parentId;
  }

  return path.join("/");
}
