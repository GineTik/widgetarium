import { z, type Slot } from "widgetarium";
import type { FigureSchema, FixSchema, ProseSourceSchema, TestStepSchema } from "./widget";

export type ProseSource = z.infer<typeof ProseSourceSchema>;

export type Figure = z.infer<typeof FigureSchema>;

export type TestStep = z.infer<typeof TestStepSchema>;

export type Fix = z.infer<typeof FixSchema>;

export type FigureSlot = Slot<{ getSource: Figure }>;
