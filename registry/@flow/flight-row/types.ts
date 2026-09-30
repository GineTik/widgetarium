import type { z } from "widgetarium";
import type { FlightSchema } from "./widget";

export type Flight = z.infer<typeof FlightSchema>;
