const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./model/userModel");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("Socket auth token missing"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "abc123");
      const user = await User.findById(decoded.id).select("_id name email role");

      if (!user) return next(new Error("Socket user not found"));

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Socket auth failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    const role = socket.user.role;

    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    console.log(`Socket connected: ${socket.user.name} (${role})`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = {
  initSocket,
  getIO,
};