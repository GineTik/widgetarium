import { startOfDay } from "./calendar";

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

export function matchesDay(date: Date, matchers: Matchers): boolean {
	if (matchers === undefined) return false;
	if (isMatcherList(matchers)) return matchers.some((matcher) => matchesOne(date, matcher));
	return matchesOne(date, matchers);
}

export function isInRange(date: Date, range: DateRange): boolean {
	const { from, to } = range;
	if (!from) return false;
	const day = startOfDay(date).getTime();
	const end = startOfDay(to ?? from).getTime();
	return day >= startOfDay(from).getTime() && day <= end;
}

function matchesOne(date: Date, matcher: Matcher): boolean {
	if (typeof matcher === "boolean") return matcher;
	if (typeof matcher === "function") return matcher(date);
	if (matcher instanceof Date) return startOfDay(matcher).getTime() === startOfDay(date).getTime();
	if (isMatcherList(matcher)) return matchesDay(date, matcher);
	if ("dayOfWeek" in matcher) return matcher.dayOfWeek.includes(date.getDay());
	if ("from" in matcher) return isInRange(date, matcher);
	return matchesBounds(date, matcher);
}

function matchesBounds(date: Date, bounds: Partial<DateInterval>): boolean {
	const day = startOfDay(date).getTime();
	const before = bounds.before ? startOfDay(bounds.before).getTime() : undefined;
	const after = bounds.after ? startOfDay(bounds.after).getTime() : undefined;
	if (before !== undefined && after !== undefined)
		return before > after ? day < before && day > after : day < before || day > after;
	if (before !== undefined) return day < before;
	return after !== undefined && day > after;
}

function isMatcherList(matchers: Matcher | readonly Matcher[]): matchers is readonly Matcher[] {
	return Array.isArray(matchers);
}
