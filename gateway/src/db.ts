import mongoose from 'mongoose';

const stateChangeSchema = new mongoose.Schema({
  gatewayId: { type: String, required: true },
  deviceId:  { type: String, required: true },
  state:     { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const StateChange = mongoose.model('StateChange', stateChangeSchema);

export async function connectDb(): Promise<void> {
  const url = process.env.DATABASE_URL!;
  await mongoose.connect(url);
  console.log('[DB] Connected to MongoDB');
}
