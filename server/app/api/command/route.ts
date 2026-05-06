import { publishCommand, publishConfig } from '@/lib/mqtt';
import prisma from '@/lib/prisma';
import type { CommandPayload, ConfigPayload } from '@/lib/types';

type CommandRequest = { gatewayId: string; nodeId: string } & CommandPayload;
type ConfigRequest = { gatewayId: string; nodeId: string } & ConfigPayload;

export async function POST(request: Request) {
  const body: CommandRequest | ConfigRequest = await request.json();
  const { gatewayId, nodeId } = body;

  if (!gatewayId || !nodeId) {
    return Response.json({ error: 'gatewayId and nodeId are required' }, { status: 400 });
  }

  const node = await prisma.node.findUnique({ where: { id: nodeId } });
  if (!node || !node.mac) {
    return Response.json({ error: 'Node not found or MAC address not assigned' }, { status: 404 });
  }

  const deviceMac = node.mac;

  if ('command' in body) {
    publishCommand(gatewayId, deviceMac, { command: body.command });
  } else if ('timeoutMs' in body) {
    publishConfig(gatewayId, deviceMac, { timeoutMs: body.timeoutMs });
  } else {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  return Response.json({ ok: true });
}
