import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import pfvlRouter from "./pfvl.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pfvlRouter);

export default router;
