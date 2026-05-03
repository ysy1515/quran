import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quranRouter from "./quran";
import bookmarksRouter from "./bookmarks";
import progressRouter from "./progress";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(quranRouter);
router.use(bookmarksRouter);
router.use(progressRouter);
router.use(settingsRouter);

export default router;
