import * as config from "../config.js";
import { nanoid } from "nanoid";
import slugify from "slugify";

import Ad from "../models/Ad.js";
import User from "../models/User.js";

export const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    const base64image = new Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const type = image.split(";")[0].split("/")[1];
    const params = {
      Bucket: "write your bucket name here, try all this things this nyt bro",
      Key: `${nanoid()}.${type}`,
      Body: base64image,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: `image/${type}`,
    };
    config.AWSS3.upload(params, (err, data) => {
      if (err) {
        res.sendStatus(400);
      } else {
        res.send(data);
      }
    });
  } catch (err) {
    res.json({ error: "Upload failed. Try again" });
  }
};

export const removeImage = async (req, res) => {
  const { Key, Bucket } = req.body;
  config.AWSS3.deleteObject({ Bucket, Key }, (err, data) => {
    if (err) {
      res.sendStatus(400);
    } else {
      res.send({ ok: true });
    }
  });
};

export const createAd = async (req, res) => {
  try {
    const { photos, description, title, address, price, type, landSize } = req.body;
    if (!photos?.length) {
      // try and limit them too with the amount of photos they can upload
      res.json({ error: "Photos are required" });
    }
    if (!type) {
      res.json({ error: "Is property House or Land?" });
    }
    if (!price) {
      res.json({ error: "Price is required" });
    }
    if (!address) {
      res.json({ error: "Address is required" });
    }
    if (!description) {
      res.json({ error: "Description is required" });
    }

    const geo = await config.GOOGLE_GEOCODER.geocode(address);
    // console.log(geo)
    const ad = await new Ad({
      ...req.body,
      postedBy: req.user._id,
      location: {
        type: "Point",
        coordinates: [geo?.[0].longitude, geo?.[0].latitude],
      },
      googleMap: geo,
    }).save();
    // make user role as seller
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { role: "Seller" },
      },
      { new: true }
    );
    user.password = undefined;
    user.resetCode = undefined;
    res.json({ ad, user });
  } catch (err) {
    res.json({ error: "Something went wrong" });
  }
};
