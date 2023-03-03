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
router.get("/get-user-ads/:page", requireSignIn, ad.getUserAds);
router.put("/edit/:adId", requireSignIn, ad.editAd);
router.delete("/delete/:adId", requireSignIn, ad.deleteAd);

router.get("/enquiries", requireSignIn, ad.enquiredProperties);
router.get("/wishlist", requireSignIn, ad.wishlist);

router.get("/ads-for-sell", ad.adsForSell);
router.get("/ads-for-rent", ad.adsForRent);

export default router;
