import { Router, type IRouter } from "express";
import healthRouter from "./health";
import topicsRouter from "./topics";
import subtopicsRouter from "./subtopics";
import questionsRouter from "./questions";
import testsRouter from "./tests";
import attemptsRouter from "./attempts";
import progressRouter from "./progress";
import studentsRouter from "./students";
import adminRouter from "./admin";
import practiceRouter from "./practice";
import gamificationRouter from "./gamification";

const router: IRouter = Router();

router.use(healthRouter);
router.use(topicsRouter);
router.use(subtopicsRouter);
router.use(questionsRouter);
router.use(testsRouter);
router.use(attemptsRouter);
router.use(progressRouter);
router.use(studentsRouter);
router.use(adminRouter);
router.use(practiceRouter);
router.use(gamificationRouter);

export default router;
