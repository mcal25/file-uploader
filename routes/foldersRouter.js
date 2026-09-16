import { Router } from "express";
import multer from "multer";
import crypto from 'crypto';
import { prisma } from "../lib/prisma.js";
import { loadFiles } from "../controllers/foldersController.js";

export const foldersRouter = Router();

foldersRouter.get('/', loadFiles);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(2, function (err, raw) {
      if (err) return cb(err)
      cb(null,  raw.toString('hex') + '-' + file.originalname)
    })
  }
});

const upload = multer({ storage: storage });

foldersRouter.post('/upload', upload.single('uploaded_file'), (req, res) => {
    res.json(req.file);
    console.log('Uploaded successfully!');
} )

foldersRouter.post('/:itemType/:id/rename', async (req, res, next) => {
  try {
    const itemId = Number.parseInt(req.params.id, 10);
    const name = req.body.name?.trim();

    if (!Number.isInteger(itemId) || !name) {
      return res.status(400).send('A valid item id and name are required.');
    }

    const model = req.params.itemType === 'folders' ? prisma.folder :
      req.params.itemType === 'files' ? prisma.file : null;

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

    res.redirect('/folders');
  } catch (error) {
    next(error);
  }
});

foldersRouter.post('/:itemType/:id/delete', async (req, res, next) => {
  try {
    const itemId = Number.parseInt(req.params.id, 10);
    const model = req.params.itemType === 'folders' ? prisma.folder :
      req.params.itemType === 'files' ? prisma.file : null;

    if (!Number.isInteger(itemId)) {
      return res.status(400).send('A valid item id is required.');
    }

    if (!model) {
      return res.status(404).send('Item type not found.');
    }

    const item = await model.findFirst({
      where: { id: itemId, userId: req.user.id },
      select: { id: true }
    });

    if (!item) {
      return res.status(404).send('Item not found.');
    }

    await model.delete({ where: { id: itemId } });
    res.redirect('/folders');
  } catch (error) {
    next(error);
  }
});