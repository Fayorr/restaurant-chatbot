import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
	deviceId: { type: String, required: true, unique: true },
	state: { type: String, default: 'MAIN_MENU' }, // States: MAIN_MENU, ORDERING
});

export default mongoose.model('Session', sessionSchema);
