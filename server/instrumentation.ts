// Called once when the Next.js server starts.
// Used to initialize the MQTT subscriber.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getClient } = await import('./lib/mqtt');
    getClient();
  }
}
