import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { requireRole } from "../../middleware/requireRole.middleware.js"
import * as productsCtrl from "../../controllers/admin/products.controller.js"

const router = Router()

router.use(authMiddleware)
router.use(requireRole("admin"))

router.post("/", productsCtrl.createProduct)
router.put("/:id", productsCtrl.updateProduct)
router.delete("/:id", productsCtrl.deleteProduct)

router.post("/:id/inventory", productsCtrl.upsertProductInventory)


export default router