import crypto from "node:crypto";
import multer from "multer";

// Multer handles the multipart form and writes each uploaded file to disk.
// A random prefix prevents two files with the same original name colliding.
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, callback) => {
    crypto.randomBytes(4, (error, bytes) => {
      if (error) return callback(error);
      callback(null, `${bytes.toString("hex")}-${file.originalname}`);
    });
  },
});

export const upload = multer({ storage });
