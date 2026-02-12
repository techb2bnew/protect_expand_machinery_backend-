import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /socket-io-info:
 *   get:
 *     tags:
 *       - Socket.IO
 *     summary: Get Socket.IO WebSocket Server documentation
 *     description: |
 *       ## 📡 Socket.IO WebSocket Server Documentation
 *       
 *       The application uses Socket.IO for real-time communication. The Socket.IO server runs on the same server as the REST API.
 *       
 *       ### Connection URLs
 *       - **Development**: `ws://localhost:9000` or `http://localhost:9000`
 *       - **Production**: `wss://expand.shabad-guru.org` or `https://expand.shabad-guru.org`
 *       
 *       ### Authentication
 *       Connect to Socket.IO with authentication token in handshake:
 *       ```javascript
 *       import { io } from 'socket.io-client';
 *       
 *       const socket = io(SOCKET_URL, {
 *         auth: {
 *           token: 'YOUR_JWT_TOKEN'
 *         },
 *         transports: ['websocket', 'polling']
 *       });
 *       ```
 *       
 *       ### Client → Server Events
 *       
 *       #### join_ticket
 *       - **Description**: Join a ticket room for real-time updates
 *       - **Payload**: `{ ticketId: string }`
 *       
 *       #### leave_ticket
 *       - **Description**: Leave a ticket room
 *       - **Payload**: `{ ticketId: string }`
 *       
 *       #### send_message
 *       - **Description**: Send a new message in a ticket room
 *       - **Payload**: `{ chatId: string, ticketId: string, content: string, messageType?: 'text' | 'image' | 'file' }`
 *       
 *       #### typing
 *       - **Description**: Send typing indicator
 *       - **Payload**: `{ ticketId: string, isTyping: boolean }`
 *       
 *       #### user_online
 *       - **Description**: Notify server that user is online
 *       - **Payload**: `{ userId: string, userEmail: string, userName: string, role: string }`
 *       
 *       #### user_offline
 *       - **Description**: Notify server that user is offline
 *       - **Payload**: `{ userId: string, userEmail: string, userName: string, role: string }`
 *       
 *       ### Server → Client Events
 *       
 *       #### welcome
 *       - **Description**: Sent when client successfully connects
 *       - **Payload**: `{ message: string, socketId: string, userName: string }`
 *       
 *       #### room_joined
 *       - **Description**: Confirmation when joining a ticket room
 *       - **Payload**: `{ ticketId: string, roomName: string, userCount: number }`
 *       
 *       #### new_message
 *       - **Description**: Real-time message from other users in the room
 *       - **Payload**: `{ _id: string, chatId: string, ticketId: string, sender: object, content: string, messageType: string, createdAt: string, isRead: boolean }`
 *       
 *       #### message_broadcast
 *       - **Description**: Broadcast message to all users in room
 *       - **Payload**: `{ ...messageData, from: string }`
 *       
 *       #### active_users
 *       - **Description**: List of active users in a ticket room
 *       - **Payload**: `string[]` (array of user names)
 *       
 *       #### user_status
 *       - **Description**: User online/offline status update
 *       - **Payload**: `{ userId: string, userName: string, userEmail: string, status: 'online' | 'offline', timestamp: Date }`
 *       
 *       #### user_typing
 *       - **Description**: Typing indicator from other users
 *       - **Payload**: `{ userId: string, userName: string, isTyping: boolean }`
 *       
 *       #### chat_notification
 *       - **Description**: Chat notification
 *       - **Payload**: `{ type: string, title: string, body: string, ticketId: string, chatId: string, from: object, createdAt: string }`
 *       
 *       #### agent_status_update
 *       - **Description**: Agent online/offline status update
 *       - **Payload**: `{ userId: string, userEmail: string, userName: string, status: 'online' | 'offline', timestamp: Date }`
 *       
 *       #### error
 *       - **Description**: Error message
 *       - **Payload**: `{ message: string }`
 *     responses:
 *       200:
 *         description: Socket.IO documentation information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Socket.IO WebSocket Server
 *                     connectionUrls:
 *                       type: object
 *                       properties:
 *                         development:
 *                           type: string
 *                           example: ws://localhost:8000
 *                         production:
 *                           type: string
 *                           example: wss://expand.shabad-guru.org
 *                     authentication:
 *                       type: string
 *                       example: JWT token in handshake auth
 *                     clientEvents:
 *                       type: array
 *                       items:
 *                         type: object
 *                     serverEvents:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/socket-io-info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Socket.IO WebSocket Server',
      connectionUrls: {
        development: process.env.SOCKET_URL || 'ws://localhost:8000',
        production: 'wss://expand.shabad-guru.org'
      },
      authentication: 'JWT token in handshake auth',
      clientEvents: [
        { name: 'join_ticket', description: 'Join a ticket room', payload: { ticketId: 'string' } },
        { name: 'leave_ticket', description: 'Leave a ticket room', payload: { ticketId: 'string' } },
        { name: 'send_message', description: 'Send a new message', payload: { chatId: 'string', ticketId: 'string', content: 'string', messageType: 'text|image|file' } },
        { name: 'typing', description: 'Send typing indicator', payload: { ticketId: 'string', isTyping: 'boolean' } },
        { name: 'user_online', description: 'Notify user is online', payload: { userId: 'string', userEmail: 'string', userName: 'string', role: 'string' } },
        { name: 'user_offline', description: 'Notify user is offline', payload: { userId: 'string', userEmail: 'string', userName: 'string', role: 'string' } }
      ],
      serverEvents: [
        { name: 'welcome', description: 'Connection confirmation', payload: { message: 'string', socketId: 'string', userName: 'string' } },
        { name: 'room_joined', description: 'Room join confirmation', payload: { ticketId: 'string', roomName: 'string', userCount: 'number' } },
        { name: 'new_message', description: 'New message from others', payload: { _id: 'string', chatId: 'string', ticketId: 'string', sender: 'object', content: 'string', messageType: 'string', createdAt: 'string', isRead: 'boolean' } },
        { name: 'message_broadcast', description: 'Broadcast message', payload: { messageData: 'object', from: 'string' } },
        { name: 'active_users', description: 'Active users list', payload: 'string[]' },
        { name: 'user_status', description: 'User status update', payload: { userId: 'string', userName: 'string', userEmail: 'string', status: 'online|offline', timestamp: 'Date' } },
        { name: 'user_typing', description: 'Typing indicator', payload: { userId: 'string', userName: 'string', isTyping: 'boolean' } },
        { name: 'chat_notification', description: 'Chat notification', payload: { type: 'string', title: 'string', body: 'string', ticketId: 'string', chatId: 'string', from: 'object', createdAt: 'string' } },
        { name: 'agent_status_update', description: 'Agent status update', payload: { userId: 'string', userEmail: 'string', userName: 'string', status: 'online|offline', timestamp: 'Date' } },
        { name: 'error', description: 'Error message', payload: { message: 'string' } }
      ]
    }
  });
});

export default router;

