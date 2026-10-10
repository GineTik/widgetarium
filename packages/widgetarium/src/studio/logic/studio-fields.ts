import { OPENABLE_PANELS } from "../studio-state.js";
import { z } from "zod";

export const NoFieldsSchema = z.object({});

export const AppFieldsSchema = z.object({ app: z.string().default("") });

export const PanelFieldsSchema = z.object({ panel: z.enum(OPENABLE_PANELS) });

export type NoFields = z.infer<typeof NoFieldsSchema>;

export type AppFields = z.infer<typeof AppFieldsSchema>;

export type PanelFields = z.infer<typeof PanelFieldsSchema>;
