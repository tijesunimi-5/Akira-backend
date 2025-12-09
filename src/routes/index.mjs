import { Router } from "express";
import waitListRouter from '../routes/waitlist/index.mjs'
import akiraUserRouter from '../routes/users/index.mjs'
import events from "../routes/events/index.mjs"

const router = Router()

//register all routes here
router.use(waitListRouter)
router.use(akiraUserRouter)
router.use(events)

export default router