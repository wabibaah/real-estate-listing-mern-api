import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

export const requireSignIn = (req, res, next) => {
  try {
    console.log(req.headers.authorization);
    const decoded = jwt.verify(req.headers.authorization, JWT_SECRET);
    req.user = decoded;
    console.log(decoded);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
