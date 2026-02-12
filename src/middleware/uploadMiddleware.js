import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directory exists before using it
const ensureDirectoryExists = (directoryPath) => {
  try {
    fs.mkdirSync(directoryPath, { recursive: true });
  } catch (err) {
    // If creation fails, let Multer bubble the error during file write
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '../../public/uploads');
    ensureDirectoryExists(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});


const storageAttachments = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, '../../public/uploads/attachments');
    ensureDirectoryExists(dest);
    cb(null, dest); // upload folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});


const uploadAttachments = multer({
  storage: storageAttachments,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});








export default { upload, uploadAttachments };
export { upload, uploadAttachments };
