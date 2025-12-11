import { Router } from "express";
import waitListRouter from "../routes/waitlist/index.mjs";
import akiraUserRouter from "../routes/users/index.mjs";
import events from "../routes/events/index.mjs";
import stores from "../routes/stores/index.mjs";
import products from "../routes/products/index.mjs";
import integrationRouter from "../routes/integration/index.mjs";

const router = Router();

//register all routes here
router.use(waitListRouter);
router.use(akiraUserRouter);
router.use(events);
router.use(stores);
router.use(products);
router.use(integrationRouter);

export default router;
