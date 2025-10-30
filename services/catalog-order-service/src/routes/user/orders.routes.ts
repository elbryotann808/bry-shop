import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { requireRole } from "../../middleware/requireRole.middleware.js"
import * as ordersCtrl from "../../controllers/user/orders.controller.js"

const router = Router()

router.use(authMiddleware)
router.use(requireRole("user"))

router.get("/", ordersCtrl.getOrders)
router.get("/:id", ordersCtrl.getOrderById )
router.post("/", ordersCtrl.createOrder)
router.post("/:id/pay", ordersCtrl.payOrder)
router.post("/:id/cancel", ordersCtrl.cancelOrder)

export default router