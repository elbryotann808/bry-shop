import { Router } from "express";
import {  getMe, loginUser, logoutUser, refreshToken, registerUser, testConection } from "../controllers/auth.controllers.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router()

router.post("/register", registerUser)

router.post("/login", loginUser)

router.post("/logout", logoutUser)

router.post("/refresh", refreshToken)

router.post("/logout" , logoutUser)

router.get("/me", requireAuth ,getMe)


router.get("/conection", testConection)

export default router