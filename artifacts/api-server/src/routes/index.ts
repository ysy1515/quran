import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quranRouter from "./quran";
import bookmarksRouter from "./bookmarks";
import progressRouter from "./progress";
import settingsRouter from "./settings";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(quranRouter);
router.use(bookmarksRouter);
router.use(progressRouter);
router.use(settingsRouter);
router.use("/push", pushRouter);

export default router;
