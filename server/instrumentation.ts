// Called once when the Next.js server starts.
// Used to initialize the MQTT subscriber.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMqttSubscriber } = await import('./lib/mqtt');
    startMqttSubscriber();
  }
}
