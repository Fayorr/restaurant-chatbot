import Order from '../models/Order.js';
import axios from 'axios';

export const verifyPayment = async (req, res) => {
	try {
		const { reference } = req.params;

		// Verify transaction with Paystack API
		const response = await axios.get(
			`https://api.paystack.co/transaction/verify/${reference}`,
			{
				headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` },
			},
		);

		if (response.data.data.status === 'success') {
			const order = await Order.findOne({ paystackRef: reference });

			if (!order) {
				return res.status(404).json({ message: 'Order not found' });
			}

			order.status = 'PAID';
			await order.save();

			return res.json({
				message: 'Payment successful! Your order is being processed.',
				order,
			});
		} else {
			return res.status(400).json({ message: 'Payment verification failed.' });
		}
	} catch (error) {
		console.error('Verification Error:', error.response?.data || error.message);
		res
			.status(500)
			.json({ message: 'Internal server error during verification.' });
	}
};
