import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
});

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const invitationInputSchema = z.object({
  title: z.string().trim().min(1).max(150),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  brideName: z.string().trim().min(1).max(100),
  groomName: z.string().trim().min(1).max(100),
  eventDate: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
  venue: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  description: optionalText(5000),
  coverImage: z.string().url().max(2048).nullable().optional(),
  templateId: z.string().min(1).max(100).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export const invitationTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  style: z.string().trim().min(2).max(100),
  description: optionalText(1000),
  coverImage: z.string().url().max(2048).refine((value) => /^https?:\/\//i.test(value)).nullable().optional(),
  color: z.enum(["olive", "rose", "blue", "peach", "sand", "plum"]),
  isActive: z.boolean().default(true),
});

export const paymentInputSchema = z.object({
  invitationId: z.string().min(1).max(100),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
