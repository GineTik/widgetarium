import type { Slot } from "widgetarium";

export type FlightFace = {
	title: string | undefined;
	status: string | undefined;
	stage: string | undefined;
	project: string | undefined;
	branch: string | undefined;
	activity: string | undefined;
	elapsed: string | undefined;
	who: string | undefined;
};

export type RowSlot = Slot<{ getFlight: FlightFace }>;
