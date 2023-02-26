import express from "express";
const router = express.Router();

import * as ad from "../controllers/ad.js";
import { requireSignIn } from "../middlewares/auth.js";

router.post("/upload-image", requireSignIn, ad.uploadImage);
router.post("/remove-image", requireSignIn, ad.removeImage);
router.post("/create", requireSignIn, ad.createAd);
router.get("/get-ads", ad.getAds);
router.get("/get-ad/:slug", ad.getAd);
router.post("/wishlist", requireSignIn, ad.addToWishlist);
router.delete("/wishlist/:adId", requireSignIn, ad.removeFromWishlist);
router.post("/contact-seller", requireSignIn, ad.contactSeller);

export default router;
