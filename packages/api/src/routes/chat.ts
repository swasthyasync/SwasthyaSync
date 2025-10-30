// packages/api/src/routes/chat.ts
import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

// Thread routes
router.get('/threads', chatController.getThreads);
router.post('/threads', chatController.createThread);

// Message routes
router.get('/threads/:threadId/messages', chatController.getMessages);
router.post('/messages', chatController.createMessage);

// Practitioner assignment
router.post('/threads/:threadId/assign', chatController.assignPractitioner);

// Unread count
router.get('/unread', chatController.getUnreadCount);

export default router;
