import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
	{
		deviceId: { type: String, required: true },
		items: [
			{
				item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
				quantity: { type: Number, default: 1 },
			},
		],
		status: {
			type: String,
			enum: ['CART', 'PLACED', 'PAID', 'CANCELLED'],
			default: 'CART',
		},
		totalAmount: { type: Number, default: 0 },
		paystackRef: { type: String },
		scheduledFor: { type: Date },
	},
	{ timestamps: true },
);

export default mongoose.model('Order', orderSchema);
