import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initializeSocket } from './socket/index.js';
import { connectDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import swaggerSpec from './config/swagger.js';
import routes from './routes/index.js';
import { seedCategories } from './utils/seedCategories.js';
import { seedEquipment } from './utils/seedEquipment.js';
import User from './models/User.js';
import { cleanupInvalidTokens } from './services/pushNotificationService.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8000;

const io = initializeSocket(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware - CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://expand.shabad-guru.org',
  'http://expand.shabad-guru.org',
  'https://www.expand.shabad-guru.org',
  'http://www.expand.shabad-guru.org',
  'https://backend.expand.shabad-guru.org',
  'http://backend.expand.shabad-guru.org'
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For now, allow all origins (you can restrict this later for security)
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory //
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Expand Machinery API Docs',
}));


// Use all routes
app.use(routes);
app.use(errorHandler);


// Connect to database and start server
const startServer = async () => {
  try {
    await connectDatabase();

    // Check if any manager exists in the system
    const existingManager = await User.findOne({ 
      role: 'manager',
      isDeleted: { $ne: true }
    });
    
    if (!existingManager) {
      // Only create default manager if no manager exists
      const managerEmail = 'manager@3dcam.com';
      await User.create({
        name: 'Manager',
        email: managerEmail,
        phone: '01234567890',
        password: 'Manager2024!',
        role: 'manager',
      });
      console.log('👤 Seeded default Manager user (manager@3dcam.com)');
    } else {
      console.log('👤 Manager already exists, skipping default manager creation');
    }

    await seedCategories();
    await seedEquipment();

    // Clean up invalid device tokens on startup (optional, controlled by env var)
    if (process.env.CLEANUP_INVALID_TOKENS_ON_STARTUP === 'true') {
      try {
        await cleanupInvalidTokens();
      } catch (cleanupError) {
        console.error('⚠️ Token cleanup failed (non-critical):', cleanupError.message);
      }
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`Socket.IO server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();


