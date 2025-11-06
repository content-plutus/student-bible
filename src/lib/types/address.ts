import { z } from "zod";
import { addressAdditionalDataSchema } from "@/lib/jsonb/schemaRegistry";

export const studentAddressSchema = z
  .object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    address_type: z.string().default("residential"),
    address_line1: z.string().min(1, "Address line 1 is required").trim(),
    address_line2: z.string().trim().nullable(),
    landmark: z.string().trim().nullable(),
    city: z.string().min(1, "City is required").trim(),
    state: z.string().min(1, "State is required").trim(),
    postal_code: z
      .string()
      .length(6)
      .regex(/^[0-9]{6}$/, "Postal code must be exactly 6 digits"),
    country: z.string().default("India"),
    additional_data: addressAdditionalDataSchema.default({}),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .superRefine((data, ctx) => {
    if (data.address_type === "delivery") {
      const hasLandmark = typeof data.landmark === "string" && data.landmark.trim().length > 0;
      if (!hasLandmark) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Landmark is required for delivery addresses",
          path: ["landmark"],
        });
      }
    }
  });

export const studentAddressInsertSchema = studentAddressSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .strict();

export const studentAddressUpdateSchema = studentAddressInsertSchema.partial();

export const studentAddressPartialSchema = studentAddressSchema.partial();

export type StudentAddress = z.infer<typeof studentAddressSchema>;
export type StudentAddressInsert = z.infer<typeof studentAddressInsertSchema>;
export type StudentAddressUpdate = z.infer<typeof studentAddressUpdateSchema>;
export type StudentAddressPartial = z.infer<typeof studentAddressPartialSchema>;
