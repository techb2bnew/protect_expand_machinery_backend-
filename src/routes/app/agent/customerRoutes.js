import { Router } from 'express';
import { appAgentAuthenticate } from '../../../middleware/authMiddleware.js';
import { 
  createCustomer, 
  getCustomers, 
  getCustomer, 
  updateCustomer, 
  deleteCustomer,
  getCustomerStats,
  exportCustomersCsv
} from '../../../controllers/website/customerController.js';

const router = Router();

router.use(appAgentAuthenticate);

/**
 * @swagger
 * /agent/customers:
 *   post:
 *     tags:
 *       - Agent Customers
 *     summary: Create new customer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - phone
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', createCustomer);

/**
 * @swagger
 * /agent/customers:
 *   get:
 *     tags:
 *       - Agent Customers
 *     summary: Get all customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of customers with pagination
 *       401:
 *         description: Unauthorized
 */
router.get('/', getCustomers);

/**
 * @swagger
 * /agent/customers/stats/summary:
 *   get:
 *     tags:
 *       - Agent Customers
 *     summary: Get customer statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/stats/summary', getCustomerStats);

/**
 * @swagger
 * /agent/customers/export/csv:
 *   get:
 *     tags:
 *       - Agent Customers
 *     summary: Export customers to CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *       401:
 *         description: Unauthorized
 */
router.get('/export/csv', exportCustomersCsv);

/**
 * @swagger
 * /agent/customers/{id}:
 *   get:
 *     tags:
 *       - Agent Customers
 *     summary: Get customer by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', getCustomer);

/**
 * @swagger
 * /agent/customers/{id}:
 *   put:
 *     tags:
 *       - Agent Customers
 *     summary: Update customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', updateCustomer);

/**
 * @swagger
 * /agent/customers/{id}:
 *   delete:
 *     tags:
 *       - Agent Customers
 *     summary: Delete customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', deleteCustomer);

export default router;
