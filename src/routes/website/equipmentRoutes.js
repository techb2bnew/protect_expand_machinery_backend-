import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { getEquipment } from '../../controllers/website/equipmentController.js';

const router = Router();

router.use(authenticate);

router.get('/', getEquipment);

export default router;

