import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { SoftwareApplication } from "../models/softwareApplicationSchema.js";

export const addNewApplication = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(
      new ErrorHandler("Software Application Icon/Image Required!", 404)
    );
  }
  const { svg } = req.files;
  const { name } = req.body;
  if (!name) {
    return next(new ErrorHandler("Please Provide Software's Name!", 400));
  }
  const cloudinaryResponse = await cloudinary.uploader.upload(
    svg.tempFilePath,
    { folder: "PORTFOLIO_SOFTWARE_APPLICATION_IMAGES" }
  );
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary Error:",
      cloudinaryResponse.error || "Unknown Cloudinary error"
    );
    return next(new ErrorHandler("Failed to upload avatar to Cloudinary", 500));
  }
  const softwareApplication = await SoftwareApplication.create({
    name,
    svg: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
  });
  res.status(201).json({
    success: true,
    message: "New Software Application Added!",
    softwareApplication,
  });
});
export const deleteApplication = catchAsyncErrors(async (req, res, next) => {});
export const getAllApplications = catchAsyncErrors(
  async (req, res, next) => {}
);
