import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { 
  createAgent, 
  getAgentsList, 
  getAgent, 
  updateAgent, 
  deleteAgent,
  toggleAgentStatus,
  getCategoryList,
  exportAgents
} from '../../controllers/website/agentController.js';

const router = Router();

router.use(authenticate);

router.post('/', createAgent);

router.get('/', getAgentsList);

router.get('/export', exportAgents);

router.get('/categorylist', getCategoryList);

router.get('/:id', getAgent);

router.put('/:id', updateAgent);

router.put('/:id/toggle-status', toggleAgentStatus);

router.delete('/:id', deleteAgent);

export default router;


