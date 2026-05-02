import { Router, type IRouter } from "express";
import healthRouter from "./health";
import topicsRouter from "./topics";
import questionsRouter from "./questions";
import testsRouter from "./tests";
import attemptsRouter from "./attempts";
import progressRouter from "./progress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(topicsRouter);
router.use(questionsRouter);
router.use(testsRouter);
router.use(attemptsRouter);
router.use(progressRouter);

export default router;
