import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
	menuNumber: { type: Number, required: true, unique: true },
	name: { type: String, required: true },
	price: { type: Number, required: true },
});

export default mongoose.model('Item', itemSchema);
