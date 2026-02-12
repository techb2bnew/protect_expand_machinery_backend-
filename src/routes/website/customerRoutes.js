import { Router } from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { 
  createCustomer, 
  getCustomers, 
  getCustomer, 
  updateCustomer, 
  deleteCustomer,
  getCustomerStats,
  exportCustomersCsv,
  activateCustomer,
  deactivateCustomer
} from '../../controllers/website/customerController.js';

const router = Router();

router.use(authenticate);

router.post('/', createCustomer);

router.get('/', getCustomers);

router.get('/stats/summary', getCustomerStats);

router.get('/export/csv', exportCustomersCsv);

router.get('/:id', getCustomer);

router.put('/:id', updateCustomer);

router.put('/:id/activate', activateCustomer);

router.put('/:id/deactivate', deactivateCustomer);

router.delete('/:id', deleteCustomer);

export default router;


