import * as config from "../config.js";
import { nanoid } from "nanoid";

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
  // // const { Key, Bucket } = req.body;
  // // config.AWSS3.deleteObject({ Bucket, Key }, (err, data) => {
  // //   if (err) {
  // //     res.sendStatus(400);
  // //   } else {
  // //     res.send({ ok: true });
  // //   }
  // });
  res.send("i am in");
};
