import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { requireRole } from "../../middleware/requireRole.middleware.js"

import * as inventoryCtrl from "../../controllers/admin/inventory.controller.js"

const router = Router()

router.use(authMiddleware)
router.use(requireRole("admin"))


router.get("/:productId", inventoryCtrl.getInventory)
router.post("/:productId/reserve", inventoryCtrl.reserveInventory)
router.post("/:productId/release", inventoryCtrl.releaseInventory)
router.post("/:productId/commit", inventoryCtrl.commitInventory)

export default router 