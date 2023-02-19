import express from "express";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";

import { MONGO_URL } from "./config.js";
import { PORT } from "./config.js";

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
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

app.get("/", (req, res) => {
  res.send("hey yey it is working");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
