import { Router } from "express";
import { loadSignup, loadFiles, doLogout, loadIndex, loadLogin, submitLogin, submitSignup } from "../controllers/indexController.js";

export const indexRouter = Router();

indexRouter.get('/', loadIndex);

indexRouter.get('/signup', loadSignup);
indexRouter.post('/signup', submitSignup);

indexRouter.get('/login', loadLogin);
indexRouter.post('/login', submitLogin);

indexRouter.get('/logout', doLogout);