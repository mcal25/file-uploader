import { Router } from "express";
import {
  createFolder,
  deleteItem,
  handleUpload,
  loadFiles,
  renameItem,
  upload,
} from "../controllers/foldersController.js";

export const foldersRouter = Router();

foldersRouter.get("/", loadFiles);

foldersRouter.post("/upload", upload.single("uploaded_file"), handleUpload);

foldersRouter.post("/new-folder", createFolder);

foldersRouter.post("/:itemType/:id/rename", renameItem);
foldersRouter.post("/:itemType/:id/delete", deleteItem);
