import { Router } from "express";
import { loadIndex, submitSignup } from "../controllers/indexController.js";
import { loadSignup } from "../controllers/indexController.js";

export const indexRouter = Router();

indexRouter.get('/', loadIndex);

indexRouter.get('/signup', loadSignup);

indexRouter.post('/signup', submitSignup);