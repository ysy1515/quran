import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quranRouter from "./quran";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(quranRouter);
router.use("/push", pushRouter);

export default router;
