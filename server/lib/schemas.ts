import * as z from "zod";

export const createZoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
  timeoutSeconds: z.number().int().positive(),
  sensorSensitivity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  lightingMode: z.enum(["automatic", "manual", "off"]),
  nightModeStart: z.string().optional(),
  nightModeEnd: z.string().optional(),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;