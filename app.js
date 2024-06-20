import express from "express";

import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import cors from "cors";
import { connectDb } from "./src/config/connection.js";
import { errorMiddleware } from "./src/middlewares/error.js";
import messageRouter from "./src/router/messageRoutes.js";
import userRouter from "./src/router/userRoutes.js";
import timelineRouter from "./src/router/timelineRoutes.js";
import applicationRouter from "./src/router/softwareApplicationRoutes.js";
import skillRouter from "./src/router/skillRoutes.js";
import projectRouter from "./src/router/projectRoutes.js";

const app = express();

app.use(
  cors({
    origin: [process.env.PORTFOLIO_URL, process.env.DASHBOARD_URL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/timeline", timelineRouter);
app.use("/api/v1/softwareapplication", applicationRouter);
app.use("/api/v1/skill", skillRouter);
app.use("/api/v1/project", projectRouter);

connectDb();
app.use(errorMiddleware);

export default app;
