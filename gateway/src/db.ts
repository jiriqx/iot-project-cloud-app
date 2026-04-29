import mongoose from 'mongoose';

const stateChangeSchema = new mongoose.Schema({
  gatewayId: { type: String, required: true },
  deviceId:  { type: String, required: true },
  state:     { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const StateChange =
  mongoose.models.StateChange ??
  mongoose.model('StateChange', stateChangeSchema);

let connected = false;

export async function connectDb(): Promise<void> {
  if (connected) return;
  const url = process.env.DATABASE_URL!;
  await mongoose.connect(url);
  connected = true;
  console.log('[DB] Connected to MongoDB');
}

export async function saveStateChange(
  gatewayId: string,
  deviceId: string,
  state: boolean,
): Promise<void> {
  await connectDb();
  await StateChange.create({ gatewayId, deviceId, state });
}
