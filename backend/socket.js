const { Server } = require("socket.io");
const { verifyBharatToken } = require("./util/auth");
const { isUserActive } = require("./util/userAccountStatus");
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

      const { decoded } = verifyBharatToken(token);
      const user = await User.findById(decoded.id).select("_id name email role status");

      if (!user) return next(new Error("Socket user not found"));

      if (!isUserActive(user)) return next(new Error("Account is inactive"));

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

    // Recheck accounts changed directly in the database as well as via the API.
    const accountCheck = setInterval(async () => {
      try {
        const current = await User.findById(userId).select("status");
        if (!isUserActive(current)) socket.disconnect(true);
      } catch {
        socket.disconnect(true);
      }
    }, 30000);
    accountCheck.unref?.();

    socket.on("disconnect", () => {
      clearInterval(accountCheck);
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