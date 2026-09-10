import { Router } from "express";
import multer from "multer";

export const filesRouter = Router();
const upload = multer({ dest: './uploads/' });

filesRouter.post('/', upload.single('uploaded_file'), (req, res) => {
    res.send("File uploaded!")
    console.log('Uploaded successfully!');
} )