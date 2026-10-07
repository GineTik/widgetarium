export const MONTH_NAMES: readonly string[] = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export const WEEKDAY_NAMES: readonly string[] = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

export const SHORT_MONTH_LETTERS = 3;

export const DAYS_IN_WEEK = 7;

export const FIXED_WEEKS = 6;

export const MONDAY = 1;

export const YEARS_BEFORE_TODAY = 100;

export const YEARS_AFTER_TODAY = 10;

export const DAYS_SEARCHED_PAST_DISABLED = 366;

export const CAPTION_LAYOUTS = ["label", "dropdown", "dropdown-months", "dropdown-years"] as const;

export type CaptionLayout = (typeof CAPTION_LAYOUTS)[number];

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
