import { z } from "zod";
import { parseDocument, parse as parseYaml } from "yaml";
import { BODY_NAMES } from "./layout-bodies.js";
import { ROOT } from "./paths.js";

export const SPEC_FOLDER = `${ROOT}/apps`;
export const SPEC_FILE = "spec.md";
export const BUILD_STAGES = ["data", "design", "catalogue", "widgets", "pages"] as const;

export type BuildStage = (typeof BUILD_STAGES)[number];

export const RECORD_VERBS = ["create", "update", "remove"] as const;

export type RecordVerb = (typeof RECORD_VERBS)[number];

const FRONT_MATTER = /^\uFEFF?---(\r?\n)([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const SPEC_WITHOUT_FRONT_MATTER = "the spec holds no front matter: open it with --- and close it with ---";
const YAML_REFUSED = "the front matter is not YAML: {why}";
const NO_SUCH_FEATURE = 'the spec has no feature "{title}"';
const NO_SUCH_CHOICE = 'the spec has no choice "{name}"';
const RECORDS_MISSING =
	"list every kind of record the app keeps, each as { name, can: [create, update, remove] } holding the verbs it allows — the card shows Add, Edit and Delete for each";
const RESEARCH_MISSING =
	"name the products you looked at before writing this spec, each as { product, takes, url } — what that product does that this app should do too, and its site";
const NO_SUCH_REFERENCE = 'the spec has no reference "{product}"';
const NO_SUCH_RECORD = 'the spec has no record "{name}"';
const NOT_AN_OPTION = '"{picked}" is not one of the options of {name}: {options}';

export function specPathOf(app: string): string {
	return `${SPEC_FOLDER}/${app}/${SPEC_FILE}`;
}

export function isBuildStage(said: unknown): said is BuildStage {
	return BUILD_STAGES.some((stage) => stage === said);
}

export function readSpec(text: string): SpecRead {
	const front = text.match(FRONT_MATTER)?.[2];
	if (front === undefined) return { refusal: SPEC_WITHOUT_FRONT_MATTER };
	const yaml = yamlOf(front);
	if (yaml.refusal !== undefined) return yaml;
	const parsed = AppSpecSchema.safeParse(yaml.value);
	return parsed.success ? { spec: parsed.data } : { refusal: issueSaid(parsed.error.issues[0]) };
}

export function withFeatureToggled(text: string, title: string): string {
	const features = specOrThrow(text).features;
	const at = features.findIndex((feature) => feature.title === title);
	const feature = features[at];
	if (!feature) throw new Error(NO_SUCH_FEATURE.replace("{title}", title));
	return withFrontSet(text, ["features", at, "kept"], !feature.kept);
}

export function withChoicePicked(text: string, name: string, picked: string): string {
	const choices = specOrThrow(text).choices;
	const at = choices.findIndex((choice) => choice.name === name);
	const choice = choices[at];
	if (!choice) throw new Error(NO_SUCH_CHOICE.replace("{name}", name));
	if (!choice.options.includes(picked))
		throw new Error(
			NOT_AN_OPTION.replace("{picked}", picked)
				.replace("{name}", choice.name)
				.replace("{options}", choice.options.join(", ")),
		);
	return withFrontSet(text, ["choices", at, "picked"], picked);
}

export function withReferenceToggled(text: string, product: string): string {
	const research = specOrThrow(text).research;
	const at = research.findIndex((one) => one.product === product);
	const reference = research[at];
	if (!reference) throw new Error(NO_SUCH_REFERENCE.replace("{product}", product));
	return withFrontSet(text, ["research", at, "kept"], !reference.kept);
}

export function withRecordVerbToggled(text: string, name: string, verb: RecordVerb): string {
	const records = specOrThrow(text).records;
	const at = records.findIndex((record) => record.name === name);
	const record = records[at];
	if (!record) throw new Error(NO_SUCH_RECORD.replace("{name}", name));
	const can = record.can.includes(verb) ? record.can.filter((held) => held !== verb) : [...record.can, verb];
	return withFrontSet(
		text,
		["records", at, "can"],
		RECORD_VERBS.filter((one) => can.includes(one)),
	);
}

export function keptFeaturesOf(spec: AppSpec): AppSpec["features"] {
	return spec.features.filter((feature) => feature.kept);
}

export function specSummaryOf(spec: AppSpec): string {
	const kept = keptFeaturesOf(spec);
	return [
		`${spec.app} — ${spec.job}`,
		`${kept.length} of ${spec.features.length} features kept, ${spec.pages.length} pages, ${spec.checks.length} checks`,
		...spec.features.map((feature) => `  ${feature.kept ? "[x]" : "[ ]"} ${feature.title}`),
		...spec.records.map(
			(record) =>
				`  ${record.name}: ${RECORD_VERBS.map((verb) => `${record.can.includes(verb) ? "" : "no "}${verb}`).join(", ")}`,
		),
	].join("\n");
}

const FeatureSchema = z.object({
	title: z.string().trim().min(1),
	says: z.string().trim().min(1),
	kept: z.boolean().default(true),
	mark: z.enum(["new", "changed", "suggested"]).optional(),
	widget: z.string().trim().min(1).optional(),
	page: z.string().trim().min(1).optional(),
	actions: z.array(z.enum(["create", "update", "remove"])),
});

const ResearchSchema = z.object({
	product: z.string().trim().min(1),
	takes: z.string().trim().min(1),
	url: z.url({ error: "url: the product's site, or the page you read about it, so the person can open it" }),
	kept: z.boolean().default(true),
});

const RecordSchema = z.object({
	name: z.string().trim().min(1),
	can: z.array(z.enum(RECORD_VERBS)),
});

const ChoiceSchema = z
	.object({
		name: z.string().trim().min(1),
		picked: z.string().trim().min(1),
		options: z.array(z.string().trim().min(1)).min(2),
	})
	.refine((choice) => choice.options.includes(choice.picked), {
		message: "picked must be one of options",
		path: ["picked"],
	});

const PageSchema = z.object({
	name: z.string().trim().min(1),
	says: z.string().trim().min(1),
	body: z.string().refine((said) => BODY_NAMES.includes(said), { message: `body is one of ${BODY_NAMES.join(", ")}` }),
	note: z.string().trim().min(1).optional(),
});

const uniqueBy =
	<Row>(keyOf: (row: Row) => string) =>
	(rows: readonly Row[]): boolean =>
		new Set(rows.map(keyOf)).size === rows.length;

export const AppSpecSchema = z.object({
	app: z.string().trim().min(1),
	job: z.string().trim().min(1),
	features: z
		.array(FeatureSchema)
		.min(1)
		.max(12)
		.refine(
			uniqueBy((feature: { readonly title: string }) => feature.title),
			{ message: "every feature needs a title of its own" },
		),
	research: z.array(ResearchSchema, { error: RESEARCH_MISSING }).min(1, { message: RESEARCH_MISSING }),
	records: z
		.array(RecordSchema, { error: RECORDS_MISSING })
		.min(1, { message: RECORDS_MISSING })
		.refine(
			uniqueBy((record: { readonly name: string }) => record.name),
			{ message: "every record needs a name of its own" },
		),
	choices: z
		.array(ChoiceSchema)
		.max(3)
		.refine(
			uniqueBy((choice: { readonly name: string }) => choice.name),
			{ message: "every choice needs a name of its own" },
		)
		.default([]),
	pages: z
		.array(PageSchema)
		.min(1)
		.refine(
			uniqueBy((page: { readonly name: string }) => page.name),
			{ message: "every page needs a name of its own" },
		),
	excluded: z.array(z.string().trim().min(1)).default([]),
	checks: z.array(z.string().trim().min(1)).min(1),
});

export type AppSpec = z.infer<typeof AppSpecSchema>;

export type SpecRead =
	{ readonly spec: AppSpec; readonly refusal?: undefined } | { readonly spec?: undefined; readonly refusal: string };

function issueSaid(issue: z.core.$ZodIssue | undefined): string {
	return `${issue?.path.join(".") || "the spec"}: ${issue?.message ?? "does not fit"}`;
}

type YamlRead = { readonly value: unknown; readonly refusal?: undefined } | { readonly refusal: string };

function yamlOf(front: string): YamlRead {
	try {
		const value: unknown = parseYaml(front);
		return { value };
	} catch (failure) {
		return { refusal: YAML_REFUSED.replace("{why}", failure instanceof Error ? failure.message : String(failure)) };
	}
}

function specOrThrow(text: string): AppSpec {
	const read = readSpec(text);
	if (read.refusal !== undefined) throw new Error(read.refusal);
	return read.spec;
}

function withFrontSet(text: string, path: readonly (string | number)[], value: unknown): string {
	const found = text.match(FRONT_MATTER);
	const [whole, end, front] = found ?? [];
	if (whole === undefined || end === undefined || front === undefined) throw new Error(SPEC_WITHOUT_FRONT_MATTER);
	const document = parseDocument(front);
	document.setIn(path, value);
	const written = document.toString().trimEnd().replace(/\r?\n/g, end);
	return `---${end}${written}${end}---${end}${text.slice(whole.length)}`;
}
