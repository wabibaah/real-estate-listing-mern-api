import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import email_validator from "email-validator";

import * as config from "../config.js";
import { emailTemplate } from "../helpers/email.js";
import { hashPassword, comparePassword } from "../helpers/auth.js";
import User from "../models/User.js";
import Ad from "../models/Ad.js";

const tokenAndUserResponse = (req, res, user) => {
  const token = jwt.sign({ _id: user._id }, config.JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ _id: user._id }, config.JWT_SECRET, { expiresIn: "7d" });

  user.password = undefined;
  user.resetCode = undefined;

  return res.json({
    token,
    refreshToken,
    user,
  });
};

// so this whole code is just for the email verification oooohhh, no actual registration yet.
export const preRegister = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email_validator.validate(email)) {
      return res.json({ error: "A valid email address is required" });
    }
    if (!password) {
      return res.json({ error: "Password is required" });
    }

    if (password && password?.length < 6) {
      return res.json({ error: "Password should be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.json({ error: `${email} is already taken.` });
    }
    const token = jwt.sign({ email, password }, config.JWT_SECRET, {
      expiresIn: "1h",
    });
    console.log(token);
    config.AWSSES.sendEmail(
      emailTemplate(
        email,
        `
      <p>Please click on the link below to activate your account</p>
      <a href="${config.CLIENT_URL}/auth/account-activate/${token}">Activate my account</a>
      `,
        config.REPLY_TO,
        "Activate your account"
      ),
      (err, data) => {
        if (err) {
          return res.json({ ok: false });
        } else {
          return res.json({ ok: true });
        }
      }
    );
  } catch (err) {
    console.log(err);
    return res.json({ error: "Something went wrong, please try again" });
  }
};

export const register = async (req, res) => {
  try {
    const decoded = jwt.verify(req.body.token, config.JWT_SECRET);
    const { email, password } = decoded;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.json({ error: "Email already taken. Log in instead" });
    }
    const hashedPassword = await hashPassword(password);
    const user = await new User({
      username: nanoid(6),
      email,
      password: hashedPassword,
    }).save();
    tokenAndUserResponse(req, res, user);
  } catch (err) {
    return res.json({ error: "Something went wrong, please try again" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        error: "No account with this email was found. Please register with a valid email.",
      });
    }
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.json({ error: "Wrong password" });
    }
    tokenAndUserResponse(req, res, user);
  } catch (err) {
    res.json({ error: "Something went wrong. Please try again" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email_validator.validate(email)) {
      return res.json({ error: "A valid email address is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        error: "No account with this email was found. Please register with a valid email.",
      });
    }
    const resetCode = nanoid();
    user.resetCode = resetCode;
    user.save();
    const token = jwt.sign({ resetCode }, config.JWT_SECRET, { expiresIn: "1h" });
    config.AWSSES.sendEmail(
      emailTemplate(
        email,
        `
        <p>Please click the link below to access your account</p>
        <a href="${config.CLIENT_URL}/auth/access-account/${token}">Access my account</a>
      `,
        config.REPLY_TO,
        "Access your account"
      ),
      (err, data) => {
        if (err) {
          console.log("resetToken", token);
          return res.json({ ok: false });
        } else {
          return res.json({ ok: true });
        }
      }
    );
  } catch (err) {
    return res.json({ error: "Something went wrong. Please try again" });
  }
};

export const accessAccount = async (req, res) => {
  try {
    const { resetCode } = jwt.verify(req.body.resetCode, config.JWT_SECRET);
    console.log(resetCode);
    const user = await User.findOneAndUpdate(
      { resetCode },
      { resetCode: "" },
      { new: true, runValidators: true }
    );
    tokenAndUserResponse(req, res, user);
  } catch (err) {
    return res.json({ error: "Something went wrong. Please try again" });
  }
};

// export const getUser = async (req, res) => {
//   const user = await User.findById(req.user);
//   res.json(user);
// };

export const refreshToken = async (req, res) => {
  try {
    const { _id } = jwt.verify(req.headers.refresh_token, config.JWT_SECRET);
    const user = await User.findById(_id);
    tokenAndUserResponse(req, res, user);
  } catch (err) {
    return res.status(403).json({ error: "Refresh token failed" });
  }
};

export const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.password = undefined;
    user.resetCode = undefined;
    return res.json(user);
  } catch (err) {
    return res.status(403).json({ error: "Unauthorized" });
  }
};

export const publicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    user.password = undefined;
    user.resetCode = undefined;
    return res.json(user);
  } catch (err) {
    return res.json({ error: "User not found" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.json({ error: "Password is required" });
    }
    if (password && password?.length < 6) {
      return res.json({ error: "Password should be minimum of 6 characters" });
    }
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        password: await hashPassword(password),
      },
      { new: true, runValidators: true }
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(403).json({ error: "Unauthorized" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true });
    user.password = undefined;
    user.resetCode = undefined;
    return res.json(user);
  } catch (err) {
    if (err.codeName === "DuplicateKey") {
      return res.json({ error: "Username is already taken, please try another one" });
    } else {
      return res.status(403).json({ error: "Unauthorized" });
    }
  }
};

export const getAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "Seller" }).select(
      "-password -role -enquiredProperties  -wishlist -photo.Key -photo.key -photo.Bucket"
    );
    res.json(agents);
  } catch (err) {
    console.log(err);
  }
};
export const agentAdCount = async (req, res) => {
  try {
    const ads = await Ad.find({ postedBy: req.params.agentId }).select("_id");
    res.json(ads);
  } catch (err) {
    console.log(err);
  }
};
export const getAgent = async (req, res) => {
  try {
    const agent = await User.findOne({ username: req.params.username }).select(
      "-password -role -enquiredProperties  -wishlist -photo.Key -photo.key -photo.Bucket"
    );
    const ads = await Ad.find({ postedBy: agent._id }).select(
      "-photos.Key -photos.key -photos.Bucket photos.ETag -location -googleMap"
    );
    res.json({ agent, ads });
  } catch (err) {
    console.log(err);
  }
};

// the refresh token only works when i refresh the page, how can i solve this issue
// watch more videos on use authentication and more
