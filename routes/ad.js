import express from "express";
const router = express.Router();

import * as ad from "../controllers/ad.js";
import { requireSignIn } from "../middlewares/auth.js";

router.post("/upload-image", requireSignIn, ad.uploadImage);

export default router;
