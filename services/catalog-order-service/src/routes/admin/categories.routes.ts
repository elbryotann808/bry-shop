import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { requireRole } from "../../middleware/requireRole.middleware.js"

import * as categoriesCtrl from "../../controllers/admin/categories.controller.js"

const router = Router()

router.use(authMiddleware)
router.use(requireRole("admin"))

router.post("/", categoriesCtrl.createCategory)
router.put("/:id", categoriesCtrl.updateCategory)
router.delete("/:id", categoriesCtrl.deleteCategory)

export default router