import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import Message from "./models/messageModels.js";
import chatRouter from "./routes/chatRoutes.js";
import userModel from "./models/userModels.js";
import connectDB from "./config/mongodb.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import guideRouter from "./routes/guideRoutes.js";
import adminRouter from "./routes/adminRoutes.js";

// Setup __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
connectDB();

// Allowed frontend origins
const allowedOrigins = ["http://localhost:5173"];

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Serve uploaded guide images
app.use("/uploads/guides", express.static(path.join(__dirname, "uploads/guides")));

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io logic
let groupOnlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.currentGroupId = null;

  socket.on("joinGroup", ({ userId, groupId }) => {
    socket.join(groupId);
    socket.currentGroupId = groupId;

    if (!groupOnlineUsers[groupId]) groupOnlineUsers[groupId] = new Set();
    groupOnlineUsers[groupId].add(socket.id);

    io.to(groupId).emit("onlineUsers", groupOnlineUsers[groupId].size);
    console.log(`User ${userId} joined group ${groupId}. Online: ${groupOnlineUsers[groupId].size}`);
  });

  socket.on("sendMessage", async ({ groupId, senderId, message }) => {
    console.log(`Received message from ${senderId} in group ${groupId}: ${message}`);
    try {
      const sender = await userModel.findById(senderId);
      const senderName = sender ? sender.name : "Unknown User";

      const newMessage = new Message({ groupId, senderId, senderName, message });
      await newMessage.save();

      io.to(groupId).emit("receiveMessage", {
        senderId,
        senderName,
        message,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    const groupId = socket.currentGroupId;
    if (groupId && groupOnlineUsers[groupId]) {
      groupOnlineUsers[groupId].delete(socket.id);
      io.to(groupId).emit("onlineUsers", groupOnlineUsers[groupId].size);
      console.log(`User disconnected from group ${groupId}. Online: ${groupOnlineUsers[groupId].size}`);
      if (groupOnlineUsers[groupId].size === 0) {
        delete groupOnlineUsers[groupId];
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

// API Routes
app.get("/", (req, res) => res.send("API Working"));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/guide", guideRouter);
app.use("/api/admin", adminRouter);
app.use("/api", chatRouter);

// Start server
server.listen(port, () => console.log(`🚀 Server started on PORT: ${port}`));
