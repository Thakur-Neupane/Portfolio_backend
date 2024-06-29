import { v2 as cloudinary } from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userSchema.js";
import { generateToken } from "../utils/jwtToken.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import ErrorHandler from "../middlewares/error.js";

// Helper function to handle Cloudinary uploads
const uploadToCloudinary = async (file, folderName) => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: folderName,
    });
    return result;
  } catch (error) {
    console.error("Cloudinary Error:", error.message);
    throw new ErrorHandler(`Failed to upload ${folderName}`, 500);
  }
};

export const register = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || !req.files.avatar || !req.files.resume) {
    return next(new ErrorHandler("Avatar and Resume are required!", 400));
  }

  const { avatar, resume } = req.files;

  const cloudinaryResponseForAvatar = await uploadToCloudinary(
    avatar,
    "PORTFOLIO AVATAR"
  );
  const cloudinaryResponseForResume = await uploadToCloudinary(
    resume,
    "PORTFOLIO RESUME"
  );

  const {
    fullName,
    email,
    phone,
    aboutMe,
    password,
    portfolioURL,
    githubURL,
    instagramURL,
    twitterURL,
    facebookURL,
    linkedInURL,
  } = req.body;

  try {
    const newUser = await User.create({
      fullName,
      email,
      phone,
      aboutMe,
      password,
      portfolioURL,
      githubURL,
      instagramURL,
      twitterURL,
      facebookURL,
      linkedInURL,
      avatar: {
        public_id: cloudinaryResponseForAvatar.public_id,
        url: cloudinaryResponseForAvatar.secure_url,
      },
      resume: {
        public_id: cloudinaryResponseForResume.public_id,
        url: cloudinaryResponseForResume.secure_url,
      },
    });

    generateToken(newUser, "Registered!", 201, res);
  } catch (error) {
    console.error("User Creation Error:", error);
    return next(new ErrorHandler("Failed to create user", 500));
  }
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Provide Email and Password!", 400));
  }

  try {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid Email or Password!", 404));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid Email or Password!", 401));
    }

    generateToken(user, "Login Successful!", 200, res);
  } catch (error) {
    console.error("Login Error:", error);
    return next(new ErrorHandler("Login failed", 500));
  }
});

export const logout = catchAsyncErrors(async (req, res, next) => {
  res.clearCookie("token").status(200).json({
    success: true,
    message: "Logged Out Successfully!",
  });
});

export const getUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    user,
  });
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const updateFields = {
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone,
    aboutMe: req.body.aboutMe,
    githubURL: req.body.githubURL,
    instagramURL: req.body.instagramURL,
    portfolioURL: req.body.portfolioURL,
    facebookURL: req.body.facebookURL,
    twitterURL: req.body.twitterURL,
    linkedInURL: req.body.linkedInURL,
  };

  if (req.files && req.files.avatar) {
    const avatar = req.files.avatar;
    const user = await User.findById(req.user.id);
    await cloudinary.uploader.destroy(user.avatar.public_id);
    const newAvatar = await uploadToCloudinary(avatar, "PORTFOLIO AVATAR");
    updateFields.avatar = {
      public_id: newAvatar.public_id,
      url: newAvatar.secure_url,
    };
  }

  if (req.files && req.files.resume) {
    const resume = req.files.resume;
    const user = await User.findById(req.user.id);
    await cloudinary.uploader.destroy(user.resume.public_id);
    const newResume = await uploadToCloudinary(resume, "PORTFOLIO RESUME");
    updateFields.resume = {
      public_id: newResume.public_id,
      url: newResume.secure_url,
    };
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    updateFields,
    { new: true, runValidators: true, useFindAndModify: false }
  );

  res.status(200).json({
    success: true,
    message: "Profile Updated Successfully!",
    user: updatedUser,
  });
});

export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return next(new ErrorHandler("Please fill in all fields!", 400));
  }

  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.comparePassword(currentPassword);

  if (!isPasswordMatched) {
    return next(new ErrorHandler("Current password is incorrect!", 401));
  }

  if (newPassword !== confirmNewPassword) {
    return next(
      new ErrorHandler("New password and confirm password do not match!", 400)
    );
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password Updated Successfully!",
  });
});

export const getUserForPortfolio = catchAsyncErrors(async (req, res, next) => {
  const id = "663296a896e553748ab5b0be"; // Sample user ID for portfolio
  const user = await User.findById(id);
  res.status(200).json({
    success: true,
    user,
  });
});

export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorHandler("User not found!", 404));
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${process.env.DASHBOARD_URL}/password/reset/${resetToken}`;

  const message = `Your Reset Password Token is: \n\n ${resetPasswordUrl}  \n\n If 
  you did not request this email, please ignore it.`;

  try {
    await sendEmail({
      email: user.email,
      subject: `Personal Portfolio Dashboard Password Recovery`,
      message,
    });

    res.status(201).json({
      success: true,
      message: `Email sent to ${user.email} successfully!`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler(error.message, 500));
  }
});

export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandler(
        "Reset password token is invalid or has expired.",
        400
      )
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler("Password and Confirm Password do not match!", 400)
    );
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  generateToken(user, "Password Reset Successfully!", 200, res);
});
