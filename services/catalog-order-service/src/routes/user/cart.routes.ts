import { Router } from "express"
import { authMiddleware } from "../../middleware/auth.middleware.js"
import { requireRole } from "../../middleware/requireRole.middleware.js"
import * as cartCtrl from "../../controllers/user/cart.controller.js"

const router = Router()

router.use(authMiddleware)
router.use(requireRole("user"))


router.get("/", cartCtrl.getCart)
router.post("/items", cartCtrl.addOrUpdateCartItem)
router.put("/items/:itemId" , cartCtrl.updateCartItem)
router.delete("/items/:itemId", cartCtrl.removeCartItem)
router.post("/checkout", cartCtrl.checkoutCart)


export default router