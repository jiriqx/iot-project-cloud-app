import { publishCommand, publishConfig } from '@/lib/mqtt';
import type { CommandPayload, ConfigPayload } from '@/lib/types';

type CommandRequest = { gatewayId: string; deviceId: string } & CommandPayload;
type ConfigRequest = { gatewayId: string; deviceId: string } & ConfigPayload;

export async function POST(request: Request) {
  const body: CommandRequest | ConfigRequest = await request.json();
  const { gatewayId, deviceId } = body;

  if (!gatewayId || !deviceId) {
    return Response.json({ error: 'gatewayId and deviceId are required' }, { status: 400 });
  }

  if ('command' in body) {
    publishCommand(gatewayId, deviceId, { command: body.command });
  } else if ('timeoutMs' in body) {
    publishConfig(gatewayId, deviceId, { timeoutMs: body.timeoutMs });
  } else {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  return Response.json({ ok: true });
}
