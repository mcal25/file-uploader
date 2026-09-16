import { Router } from "express";
import { createFolder, deleteFolder, renameFolder, showFolder } from "../controllers/foldersController.js";
import { deleteFile, renameFile, uploadFiles } from "../controllers/filesController.js";
import { upload } from "../lib/fileUpload.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const foldersRouter = Router();

foldersRouter.use(requireAuth);

foldersRouter.get("/", showFolder);
foldersRouter.post("/upload", upload.array("uploaded_file", 1000), uploadFiles);

foldersRouter.post("/new-folder", createFolder);

foldersRouter.post("/:id/rename", renameFolder);
foldersRouter.post("/:id/delete", deleteFolder);
foldersRouter.post("/files/:id/rename", renameFile);
foldersRouter.post("/files/:id/delete", deleteFile);
