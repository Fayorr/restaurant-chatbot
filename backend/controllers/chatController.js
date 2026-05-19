import Session from '../models/Session.js';
import Item from '../models/Item.js';
import Order from '../models/Order.js';
import axios from 'axios';

const MAIN_MENU = `Select 1 to Place an order\nSelect 99 to checkout order\nSelect 98 to see order history\nSelect 97 to see current order\nSelect 0 to cancel order`;

export const handleMessage = async (req, res) => {
	try {
		let { deviceId, message } = req.body;
		if (!deviceId) return res.status(400).json({ reply: 'Device ID missing.' });

		message = message?.trim().toLowerCase() || '';

		let session = await Session.findOne({ deviceId });
		if (!session) session = await Session.create({ deviceId });

		let cart = await Order.findOne({ deviceId, status: 'CART' }).populate(
			'items.item',
		);

		// Handle initial load / greeting
		if (message === '') {
			return res.json({ reply: `Welcome to our Restaurant!\n\n${MAIN_MENU}` });
		}

		// Optional feature: Handle Scheduling
		if (message.startsWith('schedule ')) {
			const dateStr = message.split('schedule ')[1];
			const parsedDate = new Date(dateStr);
			if (isNaN(parsedDate)) {
				return res.json({
					reply: "Invalid date format. Use 'schedule YYYY-MM-DD HH:mm'",
				});
			}
			let latestOrder = await Order.findOne({
				deviceId,
				status: { $in: ['CART', 'PLACED'] },
			}).sort({ createdAt: -1 });
			if (!latestOrder)
				return res.json({ reply: 'No active order to schedule.' });

			latestOrder.scheduledFor = parsedDate;
			await latestOrder.save();
			return res.json({
				reply: `Order successfully scheduled for ${parsedDate.toLocaleString()}.\n\n${MAIN_MENU}`,
			});
		}

		// 0: Cancel Order
		// 0: Cancel Order / Main Menu
		if (message === '0') {
			session.state = 'MAIN_MENU';
			await session.save();

			if (cart && cart.items.length > 0) {
				cart.status = 'CANCELLED';
				await cart.save();
				return res.json({ reply: `Order cancelled.\n\n${MAIN_MENU}` });
			} else {
				// If they don't have an active cart (like right after paying)
				return res.json({ reply: `Returning to main menu...\n\n${MAIN_MENU}` });
			}
		}

		// 97: View Current Order
		if (message === '97') {
			if (!cart || cart.items.length === 0)
				return res.json({
					reply: `Your current order is empty.\n\n${MAIN_MENU}`,
				});
			let reply = `Current Order:\n`;
			let total = 0;
			cart.items.forEach((i) => {
				reply += `- ${i.item.name} (x${i.quantity}) - ₦${i.item.price * i.quantity}\n`;
				total += i.item.price * i.quantity;
			});
			reply += `Total: ₦${total}\n\n${MAIN_MENU}`;
			return res.json({ reply });
		}

		// 98: View Order History
		if (message === '98') {
			const orders = await Order.find({
				deviceId,
				status: { $in: ['PLACED', 'PAID'] },
			}).populate('items.item');
			if (orders.length === 0)
				return res.json({ reply: `You have no past orders.\n\n${MAIN_MENU}` });
			let reply = `Order History:\n`;
			orders.forEach((o, index) => {
				reply += `Order ${index + 1} (${o.status}) - Total: ₦${o.totalAmount}\n`;
			});
			reply += `\n${MAIN_MENU}`;
			return res.json({ reply });
		}

		// 99: Checkout
		if (message === '99') {
			if (!cart || cart.items.length === 0)
				return res.json({
					reply: `No order to place.\n\nSelect 1 to place a new order.`,
				});

			cart.status = 'PLACED';
			let total = cart.items.reduce(
				(acc, i) => acc + i.item.price * i.quantity,
				0,
			);
			cart.totalAmount = total;

			try {
				const response = await axios.post(
					'https://api.paystack.co/transaction/initialize',
					{
						email: `customer-${deviceId}@restaurant.com`,
						amount: total * 100,
						callback_url: 'https://restaurant-chatbot-sandy.vercel.app/',
						metadata: { orderId: cart._id },
					},
					{
						headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` },
					},
				);

				cart.paystackRef = response.data.data.reference;
				await cart.save();

				session.state = 'MAIN_MENU';
				await session.save();

				return res.json({
					reply: `Order placed! Total amount is ₦${total}.\n\nPlease click the link below to pay:\n${response.data.data.authorization_url}\n\n(Tip: reply 'schedule YYYY-MM-DD HH:mm' to schedule delivery)\n\nSelect 1 to place a new order.`,
				});
			} catch (err) {
				console.error('Paystack Error:', err.response?.data || err.message);
				return res.json({
					reply: `Order placed, but payment initialization failed. Please contact support.\n\n${MAIN_MENU}`,
				});
			}
		}

		// 1: Place an order
		if (message === '1') {
			session.state = 'ORDERING';
			await session.save();
			const items = await Item.find();
			let reply = `Menu Options:\n`;
			items.forEach((i) => {
				reply += `Enter ${i.menuNumber} for ${i.name} (₦${i.price})\n`;
			});
			reply += `\nType 0 to cancel.`;
			return res.json({ reply });
		}

		// ORDERING State: Selecting an item by number
		if (session.state === 'ORDERING') {
			const num = parseInt(message);
			if (isNaN(num))
				return res.json({
					reply: `Invalid input. Please enter a valid menu number.\n\n${MAIN_MENU}`,
				});

			const item = await Item.findOne({ menuNumber: num });
			if (!item)
				return res.json({
					reply: `Invalid item number. Please try again or type 0 to cancel.`,
				});

			if (!cart) cart = await Order.create({ deviceId, items: [] });

			const existingItemIndex = cart.items.findIndex(
				(i) => i.item.toString() === item._id.toString(),
			);
			if (existingItemIndex > -1) {
				cart.items[existingItemIndex].quantity += 1;
			} else {
				cart.items.push({ item: item._id, quantity: 1 });
			}

			await cart.save();
			return res.json({
				reply: `${item.name} added to your order!\n\n${MAIN_MENU}`,
			});
		}

		// Fallback validation
		return res.json({ reply: `Invalid option selected.\n\n${MAIN_MENU}` });
	} catch (error) {
		console.error(error);
		res.status(500).json({ reply: 'An internal server error occurred.' });
	}
};
