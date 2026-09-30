import { IValueGateway, z, type DrawnProps, type Slot } from "widgetarium";
import type { FigureSchema, FixSchema, ProseSourceSchema, TestStepSchema, props } from "./widget";

export type ProseSource = z.infer<typeof ProseSourceSchema>;

export type Figure = z.infer<typeof FigureSchema>;

export type TestStep = z.infer<typeof TestStepSchema>;

export type Fix = z.infer<typeof FixSchema>;

export type FiguresGateway = DrawnProps<typeof props>["figures"];
export type FigureSlot = Slot<{ source: IValueGateway }>;
