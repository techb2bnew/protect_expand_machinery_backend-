import { Router } from 'express';
import { adminAuthenticate } from '../../middleware/authMiddleware.js';
import {
  getActivityLogs,
} from '../../controllers/website/activityLogController.js';

const router = Router();

router.use(adminAuthenticate);

router.get('/list', getActivityLogs);


export default router;


