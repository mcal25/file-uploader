import { Router } from "express";
import multer from "multer";
import crypto from 'crypto';
import { loadFiles } from "../controllers/filesController.js";

export const filesRouter = Router();

filesRouter.get('/', loadFiles);

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

filesRouter.post('/upload', upload.single('uploaded_file'), (req, res) => {
    res.json(req.file);
    console.log('Uploaded successfully!');
} )