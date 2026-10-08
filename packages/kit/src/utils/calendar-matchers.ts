import { dayValueOf, isMonthAllowed } from "./calendar";
import type { MonthBounds } from "./calendar";
import { warnOnce } from "./surface";

export interface DateRange {
	readonly from: Date | undefined;
	readonly to?: Date | undefined;
}

export interface DateBefore {
	readonly before: Date;
}

export interface DateAfter {
	readonly after: Date;
}

export interface DateInterval {
	readonly before: Date;
	readonly after: Date;
}

export interface DayOfWeek {
	readonly dayOfWeek: readonly number[];
}

export type Matcher =
	| boolean
	| Date
	| readonly Date[]
	| DateRange
	| DateBefore
	| DateAfter
	| DateInterval
	| DayOfWeek
	| ((date: Date) => boolean);

export type Matchers = Matcher | readonly Matcher[] | undefined;

export interface DayAllowedAsk {
	readonly disabled: Matchers;
	readonly bounds: MonthBounds;
}

export function isDayAllowed(day: Date, { disabled, bounds }: DayAllowedAsk): boolean {
	return isMonthAllowed(day, bounds) && !matchesDay(day, disabled);
}

export function matchesDay(date: Date, matchers: Matchers): boolean {
	if (matchers === undefined) return false;
	if (isMatcherList(matchers)) return matchers.some((matcher) => matchesOne(date, matcher));
	return matchesOne(date, matchers);
}

export function isInRange(date: Date, range: DateRange): boolean {
	const { from, to } = range;
	if (!from) return false;
	const day = dayValueOf(date);
	return day >= dayValueOf(from) && day <= dayValueOf(to ?? from);
}

function matchesOne(date: Date, matcher: Matcher): boolean {
	if (typeof matcher === "boolean") return matcher;
	if (typeof matcher === "function") return matcher(date);
	if (matcher instanceof Date) return dayValueOf(matcher) === dayValueOf(date);
	if (isMatcherList(matcher)) return matchesDay(date, matcher);
	if (isDayOfWeek(matcher)) return matcher.dayOfWeek.includes(date.getDay());
	if (isDateRange(matcher)) return isInRange(date, matcher);
	if (isDateBounds(matcher)) return matchesBounds(date, matcher);
	warnOnce("a Calendar disabled matcher of an unknown shape matches no day");
	return false;
}

function matchesBounds(date: Date, bounds: Partial<DateInterval>): boolean {
	const day = dayValueOf(date);
	const before = bounds.before ? dayValueOf(bounds.before) : undefined;
	const after = bounds.after ? dayValueOf(bounds.after) : undefined;
	if (before !== undefined && after !== undefined)
		return before > after ? day < before && day > after : day < before || day > after;
	if (before !== undefined) return day < before;
	return after !== undefined && day > after;
}

function isMatcherList(matchers: Matcher | readonly Matcher[]): matchers is readonly Matcher[] {
	return Array.isArray(matchers);
}

function isDayOfWeek(matcher: object): matcher is DayOfWeek {
	return "dayOfWeek" in matcher && Array.isArray(matcher.dayOfWeek);
}

function isDateRange(matcher: object): matcher is DateRange {
	return "from" in matcher && (matcher.from === undefined || matcher.from instanceof Date);
}

function isDateBounds(matcher: object): matcher is Partial<DateInterval> {
	const before = "before" in matcher ? matcher.before : undefined;
	const after = "after" in matcher ? matcher.after : undefined;
	return before instanceof Date || after instanceof Date;
}
