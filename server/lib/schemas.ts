import * as z from "zod";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Čas musí být ve formátu HH:mm (e.g. 22:00)");

export const createZoneSchema = z
  .object({
    name: z.string().min(1, "Jméno zóny je vyžadováno"),
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
        message: "nightModeStart and nightModeEnd musí být vyplněny spolu",
        path: hasStart ? ["nightModeEnd"] : ["nightModeStart"],
      });
    }

    if (hasStart && hasEnd && data.nightModeStart === data.nightModeEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "nightModeStart a nightModeEnd nemohou být stejné",
        path: ["nightModeEnd"],
      });
    }
  });

export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^\S+$/, "Uživatelské jméno nesmí obsahovat mezery"),
  password: z.string().min(8).regex(/^\S+$/, "Heslo nesmí obsahovat mezery"),
});

export const loginSchema = z.object({
  username: z.string().min(1).regex(/^\S+$/, "Uživatelské jméno nesmí obsahovat mezery"),
  password: z.string().min(1).regex(/^\S+$/, "Heslo nesmí obsahovat mezery"),
});