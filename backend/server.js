import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chatRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import Item from './models/Item.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => {
		console.log('MongoDB connected');
		seedDatabase();
	})
	.catch((err) => console.error('MongoDB Connection Error:', err));

// Seed default menu items if DB is empty
const seedDatabase = async () => {
	const count = await Item.countDocuments();
	if (count === 0) {
		await Item.insertMany([
			{ menuNumber: 10, name: 'Jollof Rice & Chicken', price: 2500 },
			{ menuNumber: 11, name: 'Fried Rice & Beef', price: 3000 },
			{ menuNumber: 12, name: 'Pounded Yam & Egusi', price: 3500 },
		]);
		console.log('Database seeded with initial menu items.');
	}
};

app.use('/api/chat', chatRoutes);
app.use('/api/payment', paymentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
