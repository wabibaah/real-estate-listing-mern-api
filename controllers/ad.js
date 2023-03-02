import { nanoid } from "nanoid";
import slugify from "slugify";

import Ad from "../models/Ad.js";
import User from "../models/User.js";
import * as config from "../config.js";
import { emailTemplate } from "../helpers/email.js";

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
      slug: slugify(`${type}-${address}-${price}-${nanoid(6)}`),
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

export const getAds = async (req, res) => {
  try {
    const adsForSell = await Ad.find({ action: "Sell" })
      .select("-googleMap -location -photo.Key -photo.key -photo.ETag ")
      .sort({ createdAt: -1 })
      .limit(12);

    const adsForRent = await Ad.find({ action: "Rent" })
      .select("-googleMap -location -photo.Key -photo.key -photo.ETag ")
      .sort({ createdAt: -1 })
      .limit(12);

    res.json({ adsForRent, adsForSell });
  } catch (err) {
    res.json({ error: "" });
  }
};

export const getAd = async (req, res) => {
  const slug = req.params.slug;
  try {
    const ad = await Ad.findOne({ slug }).populate(
      "postedBy",
      "name username email phone company photo.Location "
    );
    // do more research on this bro, i really beg you
    // you can allow the users to enable their location so that the app can pick it up from there
    const related = await Ad.find({
      _id: { $ne: ad._id },
      action: ad.action,
      type: ad.type,
      address: {
        $regex: ad.googleMap[0]?.administrativeLevels?.level2long || "",
        $options: "i",
      },
    })
      .limit(3)
      .select("-photos.Key -photos.key -photos.ETag -photos.Bucket -googleMap ");
    res.json({ ad, related });
  } catch (err) {}
};

export const addToWishlist = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { wishlist: req.body.adId },
      },
      { new: true, runValidators: true }
    );
    const { password, resetCode, ...rest } = user._doc;
    res.json({ user: rest });
  } catch (err) {
    console.log(err);
  }
};
export const removeFromWishlist = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: { wishlist: req.params.adId },
      },
      { new: true, runValidators: true }
    );
    const { password, resetCode, ...rest } = user._doc;
    res.json({ user: rest });
  } catch (err) {
    console.log(err);
  }
};

export const contactSeller = async (req, res) => {
  // if we want the server to work more, we can do a require sign in for this route and take the user info there rather that directly from the frontend
  // this is the place where we can also the person doing the enquiry too message as well
  // in the frontend , make it in such a way that if you are the owner or postedBy , you will not see the enquiry button
  const { name, email, message, phone, adId } = req.body;
  const ad = await Ad.findById(adId).populate("postedBy", "email");
  if (!ad) {
    return res.json({ error: "This Property does not exist anymore" });
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: { enquiredProperties: adId },
    },
    { new: true, runValidators: true }
  );
  if (!user) {
    return res.json({ error: "Could not find this user, Sign up or Login to make enquiry" });
  } else {
    config.AWSSES.sendEmail(
      emailTemplate(
        ad.postedBy.email,
        `
      <p>You have received a new customer enquiry</p>
      <h4>Customer details</h4>
      <p>Name: ${name}</p>
      <p>Email: ${email}</p>
      <p>Phone number: ${phone}</p>
      <p>Message: ${message}</p>
      <a href="${config.CLIENT_URL}/ad/${ad.slug}">${ad.type} in ${ad.address} for ${ad.action} GH$${ad.price}</a>    
      `,
        email,
        "New enquiry received"
      ),
      (err, data) => {
        if (err) {
          return res.json({ ok: false });
        } else {
          return res.json({ ok: true });
        }
      }
    );
  }
};

export const getUserAds = async (req, res) => {
  try {
    const perPage = 2; // change this later to maybe 6 or 10
    const page = req.params.page ? req.params.page : 1;
    const total = await Ad.find({ postedBy: req.user._id });
    const ads = await Ad.find({ postedBy: req.user._id })
      // .select("-photos.Key -photos.key -photos.ETag -photos.Bucket -location -googleMap")
      .populate("postedBy", "name email username phone company")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });

    res.json({ ads, total: total.length });
  } catch (err) {
    console.log(err);
  }
};

export const editAd = async (req, res) => {
  // look for a special way to send the res well not the one that will be captured in an else block that if there is no error
  try {
    const { photos, price, type, address, description } = req.body;

    const ad = await Ad.findById(req.params.adId);
    if (!ad) {
      return res.json({ error: "Add not found" });
    }
    const owner = req.user._id == ad?.postedBy;

    if (!owner) {
      return res.json({
        error: "Access denied, you did not create this ad so you can not edit it",
      });
    } else {
      if (!photos.length) {
        return res.json({ error: "Photos are required" });
      }
      if (!price) {
        return res.json({ error: "Price is required" });
      }
      if (!type) {
        return res.json({ error: "Is property House or Land?" });
      }
      if (!address) {
        return res.json({ error: "Address is required" });
      }
      if (!description) {
        return res.json({ error: "Description is required" });
      }

      const geo = await config.GOOGLE_GEOCODER.geocode(address);
      const updatedAd = await ad.update({
        ...req.body,
        slug: ad.slug,
        location: {
          type: "Point",
          coordinates: [geo?.[0]?.longitude, geo?.[0]?.latitude],
        },
      });
      res.json({ ok: true });
    }
  } catch (err) {
    console.log(err);
  }
};

export const deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.adId);
    const owner = req.user._id == ad.postedBy; // the variable name can be isOwner and the comparisnon can be "===" (3) not (2)
    if (!owner) {
      return res.json({ error: "Permission denied, you are not the owner of this Listing" });
    } else {
      await Ad.findByIdAndDelete(ad._id); // a lot of redundant going and coming just say ad.remove or delete
      res.json({ ok: true });
      // in the frontend you can do the check if they are not the owners, the cannot even see the delete button
    }
  } catch (err) {
    console.log(err);
  }
};
