import * as z from "zod";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format (e.g. 22:00)");

export const createZoneSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    timeoutSeconds: z.number().int().positive(),
    sensorSensitivity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    lightingMode: z.enum(["automatic", "manual", "off"]),
    nightModeStart: timeString.optional(),
    nightModeEnd: timeString.optional(),
  })
  .superRefine((data, ctx) => {
    const hasStart = data.nightModeStart !== undefined;
    const hasEnd = data.nightModeEnd !== undefined;

    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Both nightModeStart and nightModeEnd must be provided together",
        path: hasStart ? ["nightModeEnd"] : ["nightModeStart"],
      });
    }

    if (hasStart && hasEnd && data.nightModeStart === data.nightModeEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "nightModeStart and nightModeEnd cannot be the same time",
        path: ["nightModeEnd"],
      });
    }
  });

export type CreateZoneInput = z.infer<typeof createZoneSchema>;