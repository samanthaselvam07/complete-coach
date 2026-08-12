import { z } from "zod";

export const FormFieldTypeSchema = z.enum([
  "short-text",
  "long-text",
  "content-block",
  "number",
  "scale",
  "multiple-choice",
  "radio-buttons",
  "dropdown",
  "rating-10",
  "checkbox",
  "date",
  "time",
  "email",
  "phone",
  "photo"
]);

export const FormFieldExportPolicySchema = z.enum(["private", "metadata", "metric", "pii"]);

export const FormFieldDefinitionSchema = z
  .object({
    id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    type: FormFieldTypeSchema,
    label: z.string().min(1).max(160),
    required: z.boolean().default(false),
    placeholder: z.string().max(240).optional(),
    content: z.string().max(20000).optional(),
    options: z.array(z.string().min(1).max(160)).max(50).optional(),
    metricKey: z.string().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/).optional(),
    metricUnit: z.string().min(1).max(32).optional(),
    category: z.string().min(1).max(120).optional(),
    exportPolicy: FormFieldExportPolicySchema.default("private")
  })
  .superRefine((field, context) => {
    if (field.exportPolicy === "metric" && !field.metricKey) {
      context.addIssue({
        code: "custom",
        message: "Metric fields require metricKey.",
        path: ["metricKey"]
      });
    }

    if (field.metricKey && !["number", "scale"].includes(field.type)) {
      context.addIssue({
        code: "custom",
        message: "Only number and scale fields can be extracted as metrics.",
        path: ["type"]
      });
    }
  });

export const FormDefinitionSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  fields: z.array(FormFieldDefinitionSchema).max(100)
});

export type FormDefinition = z.infer<typeof FormDefinitionSchema>;
export type FormFieldDefinition = z.infer<typeof FormFieldDefinitionSchema>;
