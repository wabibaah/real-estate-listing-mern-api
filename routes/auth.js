import express from "express";
const router = express.Router();

import * as auth from "../controllers/auth.js";
import { requireSignIn } from "../middlewares/auth.js";

router.post("/pre-register", auth.preRegister);
router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.post("/access-account", auth.accessAccount);
// router.get("/get-user", requireSignIn, auth.getUser);
router.get("/refresh-token", auth.refreshToken);
router.get("/current-user", requireSignIn, auth.currentUser);

export default router;
