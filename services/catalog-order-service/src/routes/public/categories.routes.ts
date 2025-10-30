import { Router } from "express"
import { getCategoryById, listCategories } from "../../controllers/public/categories.controller.js"

const router = Router()

router.get("/", listCategories)

router.get("/:id", getCategoryById)

export default router