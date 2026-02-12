import { Router } from 'express';
import { getCurrentUser, updateProfile, uploadAvatar } from '../../controllers/website/profileController.js';
import { authenticate } from '../../middleware/authMiddleware.js';
import { upload } from '../../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/me', getCurrentUser);

router.put('/update', updateProfile);

router.post('/profile-image', upload.single('profileImage'), uploadAvatar);

export default router;


