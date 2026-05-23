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

const nodeSchema = new mongoose.Schema({
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  externalId: { type: String },
  mac: { type: String },
  status: { type: String },
});

export const Node =
  mongoose.models.Node ??
  mongoose.model('Node', nodeSchema);

const zoneSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String },
  timeoutSeconds: { type: Number },
  sensorSensitivity: { type: String },
  lightingMode: { type: String },
  nightModeStart: { type: String },
  nightModeEnd: { type: String },
});

export const Zone =
  mongoose.models.Zone ??
  mongoose.model('Zone', zoneSchema);

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

export async function savePing(deviceMac: string): Promise<Date | null> {
  await connectDb();
  const existing = await Ping.findOne({ deviceMac });
  const previousPing = existing?.lastPing ?? null;

  await Ping.findOneAndUpdate(
    { deviceMac },
    { lastPing: new Date() },
    { upsert: true },
  );

  return previousPing;
}

export async function getTimeoutForDevice(deviceMac: string): Promise<number | null> {
  await connectDb();
  const node = await Node.findOne({ mac: { $regex: new RegExp(`^${deviceMac}$`, 'i') } });
  if (!node) {
    console.warn(`[DB] No node found for MAC: ${deviceMac}`);
    return null;
  }
  const zone = await Zone.findById(node.zoneId);
  if (!zone) {
    console.warn(`[DB] No zone found for node ${node._id} (zoneId: ${node.zoneId})`);
    return null;
  }
  if (zone.timeoutSeconds == null) {
    console.warn(`[DB] Zone "${zone.name}" has no timeoutSeconds configured`);
    return null;
  }
  return zone.timeoutSeconds;
}
