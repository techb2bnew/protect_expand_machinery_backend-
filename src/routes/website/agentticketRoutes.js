import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import {
    getTicketList,
    getTicketByID
} from '../../controllers/website/agentTicketController.js';

const router = Router();

router.use(authenticate);

router.get('/', getTicketList);

router.get('/:id', getTicketByID);

export default router;


