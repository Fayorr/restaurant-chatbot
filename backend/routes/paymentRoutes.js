import express from 'express';
import { verifyPayment } from '../controllers/paymentController.js';

const router = express.Router();

// Route to verify Paystack payment
router.get('/verify/:reference', verifyPayment);

export default router;
