import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { uploadAttachments } from '../../middleware/uploadMiddleware.js';
import {
  getTickets,
  getTicket,
  assignTicket,
  updateTicketStatus,
  updateTicketNotes,
  createTicket
} from '../../controllers/website/ticketController.js';

const router = Router();

router.use(authenticate);

router.get('/', getTickets);

router.get('/:id', getTicket);

// Specific routes should come before generic :id routes
router.put('/:id/notes', updateTicketNotes);

router.post('/:id/assign', assignTicket);

router.put('/:id', updateTicketStatus);

router.post('/create', uploadAttachments.array('attachments', 5), createTicket);

export default router;


