import { z } from "zod";

export const NoFieldsSchema = z.object({});

export const AppFieldsSchema = z.object({ app: z.string().default("") });

export type NoFields = z.infer<typeof NoFieldsSchema>;

export type AppFields = z.infer<typeof AppFieldsSchema>;
