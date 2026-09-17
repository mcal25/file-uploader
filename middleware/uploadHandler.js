import multer from "multer";
import { upload } from "../lib/fileUpload.js";

export function handleUpload(req, res, next) {
  upload.array("uploaded_file", 1000)(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).send("Each file must be 5 MB or smaller.");
    }

    next(error);
  });
}
