import app from "./app.js";
import cloudinary from "cloudinary";

const PORT = process.env.PORT || 4000;

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.get("/", (req, res, next) => {
  res.json({
    status: "success",
    message: "server is live",
  });
});

// app.use("*", (req, res, next) => {
//   const err = new Error("404 Page not  found");
//   err.statusCode = 404;
//   next(err);
// });

app.use((error, req, res, next) => {
  console.log(error, "--------");

  res.status(error.statusCode || 500);
  res.json({
    status: "error",
    message: error.message,
  });
});

app.listen(PORT, (error) => {
  error
    ? console.log(error)
    : console.log(`Server running at http://localhost:${PORT}`);
});
