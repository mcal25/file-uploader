import { Router } from "express";
import {
	createFolder,
	deleteFolder,
	downloadFolder,
	renameFolder,
	showFolder,
} from "../controllers/foldersController.js";
import {
	deleteFile,
	downloadFile,
	renameFile,
	uploadFiles,
} from "../controllers/filesController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { handleUpload } from "../middleware/uploadHandler.js";

export const foldersRouter = Router();

foldersRouter.use(requireAuth);

foldersRouter.get("/", showFolder);
foldersRouter.post("/upload", handleUpload, uploadFiles);

foldersRouter.post("/new-folder", createFolder);

foldersRouter.post("/:id/rename", renameFolder);
foldersRouter.post("/:id/delete", deleteFolder);
foldersRouter.get("/:id/download", downloadFolder);
foldersRouter.get("/files/:id/download", downloadFile);
foldersRouter.post("/files/:id/rename", renameFile);
foldersRouter.post("/files/:id/delete", deleteFile);
