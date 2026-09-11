import { Router } from "express";
import multer from "multer";
import crypto from 'crypto';
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