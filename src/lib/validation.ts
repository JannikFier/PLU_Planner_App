import { z } from 'zod'

export const emailSchema = z
  .string()
  .min(1, 'E-Mail darf nicht leer sein.')
  .email('Bitte eine gültige E-Mail-Adresse eingeben.')

export const personalnummerSchema = z
  .string()
  .min(1, 'Personalnummer darf nicht leer sein.')
  .max(20, 'Personalnummer darf max. 20 Zeichen lang sein.')

export const passwordSchema = z
  .string()
  .min(6, 'Passwort muss mindestens 6 Zeichen lang sein.')

export const displayNameSchema = z
  .string()
  .min(1, 'Name darf nicht leer sein.')
  .max(100, 'Name darf max. 100 Zeichen lang sein.')

export const loginEmailSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const loginPersonalnummerSchema = z.object({
  personalnummer: personalnummerSchema,
  password: passwordSchema,
})

/** E-Mail optional – leer erlaubt; bei Angabe muss gültig sein. System generiert sonst personalnummer@plu-planner.local */
const createUserEmailSchema = z
  .string()
  .refine(
    (v) => v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    'Bitte eine gültige E-Mail-Adresse eingeben.',
  )

export const createUserSchema = z
  .object({
    email: createUserEmailSchema,
    password: passwordSchema,
    display_name: displayNameSchema,
    personalnummer: personalnummerSchema.optional(),
    role: z.enum(['super_admin', 'admin', 'user', 'viewer']),
  })
  .refine(
    (data) =>
      (data.email ?? '').trim().length > 0 || (data.personalnummer ?? '').trim().length > 0,
    { message: 'Mindestens eines von Personalnummer oder E-Mail muss angegeben werden.' },
  )

// --- Edge Function Response Schemas ---

/** create-user Response – erwartet user-Objekt */
export const createUserResponseSchema = z.object({
  user: z.object({ id: z.string() }).passthrough().optional(),
  error: z.string().optional(),
})

/** Generische Erfolgs-Response (reset-password, delete-user, update-user-role, update-user-store-access) */
export const successResponseSchema = z.object({
  success: z.boolean().optional(),
  error: z.string().optional(),
})

/**
 * Validiert eine Edge Function Response.
 * Wirft bei ungültiger Response einen Fehler mit klarer Meldung.
 */
export function validateEdgeFunctionResponse<T>(
  data: unknown,
  schema: z.ZodType<T>,
  functionName: string,
): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error(`[Edge Function ${functionName}] Ungültige Response:`, result.error.flatten())
    throw new Error(`Unerwartete Antwort von ${functionName}. Bitte versuche es erneut.`)
  }
  return result.data
}
