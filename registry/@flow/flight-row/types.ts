import type { z } from "zod";
import type { FlightSchema } from "./widget";

export type Flight = z.infer<typeof FlightSchema>;
