import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pfvlRouter from "./pfvl";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pfvlRouter);

export default router;
