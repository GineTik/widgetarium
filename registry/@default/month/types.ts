export type Size = { width: number; height: number };

export type MonthDay = {
	day: string;
	dayOfMonth: number;
	isOutside: boolean;
};

export type DayCell = MonthDay & {
	kept: boolean;
	run: string;
	ring: string;
	isAhead: boolean;
	canPress: boolean;
};
