import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { 
  getOrCreateChat, 
  getChatMessages, 
  sendMessage, 
  getUserChatsLists 
} from '../../controllers/website/chatController.js';

const router = Router();

router.use('/admin', authenticate);

router.get('/admin/chats', getUserChatsLists);

router.get('/admin/chat/ticket/:ticketId', getOrCreateChat);

router.get('/admin/chat/:chatId/messages', getChatMessages);

router.post('/admin/chat/send', sendMessage);

export default router;
