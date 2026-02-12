import { Router } from 'express';
import { adminAuthenticate } from '../../middleware/authMiddleware.js';
import { 
  getLatestTerms,
  getAllTerms,
  createTerms,
  updateTerms
} from '../../controllers/website/termsController.js';

const router = Router();

// Public route - Get terms (for app)
router.get('/latest', getLatestTerms);

// Protected routes - Admin only
router.use(adminAuthenticate);

router.get('/', getAllTerms);

router.post('/', createTerms);

router.put('/', updateTerms);



// Privacy Policy routes (same controller, different type)
router.get('/privacy-policy', (req, res, next) => {
  req.query.type = 'privacy_policy';
  next();
}, getAllTerms);

router.post('/privacy-policy', (req, res, next) => {
  req.body.type = 'privacy_policy';
  next();
}, createTerms);

router.put('/privacy-policy', (req, res, next) => {
  req.body.type = 'privacy_policy';
  next();
}, updateTerms);

export default router;

