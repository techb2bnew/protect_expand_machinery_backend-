import { Server } from 'socket.io';
import { socketAuthMiddleware, handleSocketConnection } from './socketHandler.js';

// Global io instance
let io;

// Get io instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Initialize Socket.IO
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowEIO3: true
  });

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle socket connections
  handleSocketConnection(io);

  return io;
};
