import express from "express";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";

import { MONGO_URL } from "./config.js";
import { PORT } from "./config.js";

import authRoutes from "./routes/auth.js";
import adRoutes from "./routes/ad.js";

const app = express();

// mongodb database
mongoose.set("strictQuery", false);
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("DB connected");
  })
  .catch((err) => {
    console.log(err);
  });

// middlewares
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/ad", adRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
