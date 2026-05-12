import mongoose from 'mongoose';

const stateChangeSchema = new mongoose.Schema({
  gatewayId: { type: String, required: true },
  deviceMac: { type: String, required: true },
  state: { type: Boolean, required: true },
  trigger: { type: String, default: 'auto' },
  timestamp: { type: Date, default: Date.now },
});

export const StateChange =
  mongoose.models.StateChange ??
  mongoose.model('StateChange', stateChangeSchema);

const pingSchema = new mongoose.Schema({
  deviceMac: { type: String, required: true, unique: true },
  lastPing: { type: Date, default: Date.now },
});

export const Ping =
  mongoose.models.Ping ??
  mongoose.model('Ping', pingSchema);

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
  deviceMac: string,
  state: boolean,
  trigger: string = 'auto',
): Promise<void> {
  await connectDb();
  await StateChange.create({ gatewayId, deviceMac, state, trigger });
}

export async function savePing(deviceMac: string): Promise<void> {
  await connectDb();
  await Ping.findOneAndUpdate(
    { deviceMac },
    { lastPing: new Date() },
    { upsert: true },
  );
}
