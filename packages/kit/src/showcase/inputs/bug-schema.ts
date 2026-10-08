import type { FormIssue, FormParse, FormSchema } from "../../utils/form-state";

export interface BugReport {
	readonly title: string;
	readonly description: string;
}

interface LengthRule {
	readonly field: keyof BugReport;
	readonly min: number;
	readonly max: number;
	readonly name: string;
}

const RULES: readonly LengthRule[] = [
	{ field: "title", min: 5, max: 32, name: "Bug title" },
	{ field: "description", min: 20, max: 100, name: "Description" },
];

export const BUG_SCHEMA: FormSchema<BugReport> = { safeParse: parsedBugReport };

function parsedBugReport(input: unknown): FormParse<BugReport> {
	const report = bugReportOf(input);
	const issues = RULES.flatMap((rule) => issuesOf(rule, report[rule.field]));
	if (issues.length > 0) return { success: false, error: { issues } };
	return { success: true, data: report };
}

function bugReportOf(input: unknown): BugReport {
	if (typeof input !== "object" || input === null) return { title: "", description: "" };
	return { title: stringIn(input, "title"), description: stringIn(input, "description") };
}

function issuesOf(rule: LengthRule, value: string): FormIssue[] {
	if (value.length < rule.min)
		return [{ path: [rule.field], message: `${rule.name} must be at least ${rule.min} characters.` }];
	if (value.length > rule.max)
		return [{ path: [rule.field], message: `${rule.name} must be at most ${rule.max} characters.` }];
	return [];
}

function stringIn(input: object, field: keyof BugReport): string {
	const value: unknown = Reflect.get(input, field);
	return typeof value === "string" ? value : "";
}
