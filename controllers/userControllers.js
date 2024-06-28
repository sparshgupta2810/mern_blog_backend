const HttpError = require("../models/errorModels");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;

    // Check if all required fields are provided
    if (!name || !email || !password || !password2) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    const newEmail = email.toLowerCase();

    // Check if the email already exists
    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError("Email already exists", 422));
    }

    // Check if passwords match
    if (password !== password2) {
      return next(new HttpError("Passwords do not match", 422));
    }

    // Check if password length is at least 6 characters
    if (password.trim().length < 6) {
      return next(
        new HttpError("Password should be at least 6 characters", 422)
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPass,
    });
    res.status(201).json(newUser);
  } catch (error) {
    return next(new HttpError("User registration failed", 422));
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    const newEmail = email.toLowerCase();

    const user = await User.findOne({ email: newEmail });
    if (!user) {
      return next(new HttpError("Invalid credentials", 422));
    }

    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      return next(new HttpError("Invalid credentials", 422));
    }

    const { _id: id, name } = user;
    const token = jwt.sign({ id, name }, process.env.PRIVATE_KEY, {
      expiresIn: "1d",
    });
    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(new HttpError("User login failed", 422));
  }
};

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      return next(new HttpError("User not found", 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError("Fetching user failed", 500));
  }
};

const changeAvatar = async (req, res, next) => {
  try {
    // Check if avatar file is provided
    if (!req.files || !req.files.avatar) {
      return next(new HttpError("Please choose an image", 422));
    }

    // Find user by ID
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    // Delete old avatar if exists
    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", "uploads", user.avatar), (err) => {
        if (err) {
          return next(new HttpError("Deleting old avatar failed", 500));
        }
      });
    }

    // Validate file size
    const { avatar } = req.files;
    if (avatar.size > 500000) {
      return next(
        new HttpError("Profile picture is too large. Please use an image less than 500kb", 422)
      );
    }

    // Generate new file name
    const fileName = avatar.name;
    const splittedName = fileName.split(".");
    const newFileName =
      splittedName[0] + uuid() + "." + splittedName[splittedName.length - 1];

    // Move avatar to uploads folder
    avatar.mv(
      path.join(__dirname, "..", "uploads", newFileName),
      async (err) => {
        if (err) {
          return next(new HttpError("Failed to upload avatar", 500));
        }

        // Update user's avatar field in database
        const updatedUser = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFileName },
          { new: true } // Return updated document
        );

        if (!updatedUser) {
          return next(new HttpError("Avatar update failed", 422));
        }

        // Respond with updated user data
        res.status(200).json(updatedUser);
      }
    );
  } catch (error) {
    return next(new HttpError("Avatar change failed", 500));
  }
};


const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, confirmNewPassword } =
      req.body;

    // Check if all required fields are provided
    if (!name || !email || !currentPassword || !newPassword) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail && existingEmail._id.toString() !== req.user.id) {
      return next(new HttpError("Email already exists", 422));
    }

    // Check if current password matches
    const compareCurrentPass = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!compareCurrentPass) {
      return next(new HttpError("Invalid current password", 422));
    }

    if (newPassword !== confirmNewPassword) {
      return next(new HttpError("Passwords do not match", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(newPassword, salt);

    const updatedInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hashedPass },
      { new: true }
    );

    if (!updatedInfo) {
      return next(new HttpError("User update failed", 422));
    }

    res.status(200).json(updatedInfo);
  } catch (error) {
    return next(new HttpError("User update failed", 500));
  }
};

const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select("-password");
    res.status(200).json(authors);
  } catch (error) {
    return next(new HttpError("Fetching authors failed", 500));
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getAuthors,
};

