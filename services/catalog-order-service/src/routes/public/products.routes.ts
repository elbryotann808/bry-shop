import { Router } from "express";
import { getProductById, getProductBySlug, listProducts } from "../../controllers/public/products.controller.js";

const router = Router()

router.get("/", listProducts)

router.get("/:id", getProductById)

router.get("/slug/:slug", getProductBySlug)

export default router