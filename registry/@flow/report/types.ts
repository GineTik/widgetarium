import { IValueGateway, z, type DrawnProps, type Slot } from "widgetarium";
import type { FigureSchema, FixSchema, TestStepSchema, props } from "./widget";

export type ProseSource = string | { content?: string | null; body?: string | null; path?: string | null } | null;

export type Figure = z.infer<typeof FigureSchema>;

export type TestStep = z.infer<typeof TestStepSchema>;

export type Fix = z.infer<typeof FixSchema>;

export type FiguresGateway = DrawnProps<typeof props>["figures"];
export type FigureSlot = Slot<{ source: IValueGateway }>;
