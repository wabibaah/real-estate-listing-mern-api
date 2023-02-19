import express from "express";
const router = express.Router();

import { tetteh } from "../controllers/authController.js";

router.get("/", tetteh);

export default router;
