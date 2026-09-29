import { z } from "zod";
import type { Declaration } from "./declaration";
import { DECLARATION, declarationIn, defaultOf } from "./declaration";
import type { DeclaredProps, MigrationStep, PropMetadata } from "./declared";
import type { Choice } from "./manifest";
import { PROP_MARK, specOf } from "./manifest";

export type Described = Readonly<Record<string, PropMetadata<unknown>>>;

const NOT_DECLARED =
	'prop "{name}" is not a gateway declared with IValueGateway.of, IListGateway.of, ICrudGateway.of, ISlot.of, IMounts.of or one the host hands over (IHost, INavigator, …)';
const METADATA_FOR_NOTHING = 'metadata describes prop "{name}", which props do not declare';
const METADATA_FOR_THE_ENGINE = 'metadata describes prop "{name}", which the engine hands over and a person never sets';
const READS_NOTHING_DECLARED =
	'prop "{name}" starts from a source whose {option} is "{target}", which props do not declare';
const AN_IMPLEMENTATION =
	'prop "{name}" is {implementation}, an implementation; a widget declares the interface it needs (IValueGateway.of(...), ICrudGateway.of(...)) and the host decides what fills it';
const MIGRATES_FROM_NOTHING = "migration {at} names no props it migrates from";

const SIBLING_FIELDS = ["rows", "picked", "fieldFrom"] as const;

export function partsOfDeclared(props: DeclaredProps, described: Described) {
	const parts = { props: {}, slots: {}, mounts: {} } as Record<"props" | "slots" | "mounts", Record<string, unknown>>;
	for (const [name, held] of Object.entries(props)) {
		const declaration = declarationIn(held) as Declaration;
		if (declaration.kind === "passed") continue;
		if (declaration.kind === "slot") parts.slots[name] = heldSpecOf(declaration, described[name] ?? {});
		else if (declaration.kind === "mounts") parts.mounts[name] = heldSpecOf(declaration, described[name] ?? {});
		else parts.props[name] = propOfDeclared(name, declaration, described[name] ?? {});
	}
	return {
		props: parts.props,
		...(Object.keys(parts.slots).length > 0 ? { slots: parts.slots } : {}),
		...(Object.keys(parts.mounts).length > 0 ? { mounts: parts.mounts } : {}),
	};
}

export function migrationOfDeclared(step: MigrationStep<DeclaredProps>) {
	const { props } = partsOfDeclared(step.from, {});
	return {
		from: Object.fromEntries(Object.entries(props).map(([name, prop]) => [name, specOf(name, prop)])),
		run: step.run,
	};
}

export function refuseUndeclared(props: DeclaredProps) {
	const stray = Object.keys(props).find((name) => declarationIn(props[name]) === null);
	if (stray) throw new Error(NOT_DECLARED.replace("{name}", stray));
}

export function refuseImplementations(props: DeclaredProps) {
	const named = Object.keys(props).find(
		(name) => declarationIn(props[name]) !== null && !Object.prototype.hasOwnProperty.call(props[name], DECLARATION),
	);
	if (named)
		throw new Error(
			AN_IMPLEMENTATION.replace("{name}", named).replace(
				"{implementation}",
				(props[named] as { name?: string }).name ?? "a class",
			),
		);
}

export function refuseSourcesOverNothing(props: DeclaredProps, described: Readonly<Record<string, unknown>>) {
	const names = Object.keys(props);
	for (const [name, held] of Object.entries(described)) {
		const fields =
			(held as { source?: { fields?: Readonly<Record<string, unknown>> } } | undefined)?.source?.fields ?? {};
		const option = SIBLING_FIELDS.find((key) => {
			const target = fields[key];
			return typeof target === "string" && !target.includes("/") && !names.includes(target);
		});
		if (option)
			throw new Error(
				READS_NOTHING_DECLARED.replace("{name}", name)
					.replace("{option}", option)
					.replace("{target}", String(fields[option])),
			);
	}
}

export function refuseMetadataForNothing(props: DeclaredProps, described: Readonly<Record<string, unknown>>) {
	const names = Object.keys(props);
	const stray = Object.keys(described).find((name) => !names.includes(name));
	if (stray) throw new Error(METADATA_FOR_NOTHING.replace("{name}", stray));
	const handed = Object.keys(described).find((name) => declarationIn(props[name])?.kind === "passed");
	if (handed) throw new Error(METADATA_FOR_THE_ENGINE.replace("{name}", handed));
}

export function refuseEmptyMigrations(steps: readonly MigrationStep<DeclaredProps>[]) {
	steps.forEach((step, at) => {
		if (Object.keys(step.from).length === 0) throw new Error(MIGRATES_FROM_NOTHING.replace("{at}", String(at + 1)));
		refuseUndeclared(step.from);
	});
}

function propOfDeclared(name: string, declaration: Declaration, described: PropMetadata<unknown>) {
	const options = described.options ?? enumOptions(declaration.schema);
	const describes = describesWithAka(
		name,
		described.describes as Readonly<Record<string, unknown>> | undefined,
		declaration.schema,
	);
	return {
		...described,
		...(describes ? { describes } : {}),
		...(options ? { options } : {}),
		...(declaration.where ? { where: declaration.where } : {}),
		...(declaration.sort ? { sort: declaration.sort } : {}),
		...(declaration.writes.length > 0 ? { writes: [...declaration.writes] } : {}),
		default: defaultOf(declaration),
		[PROP_MARK]: true,
	};
}

const AKA_LIVES_IN_THE_SCHEMA =
	'prop "{name}" names aka for field "{field}" in metadata; other names belong to the schema: add .meta({ aka: [...] }) to the schema of {field}';

function describesWithAka(name: string, described: Readonly<Record<string, unknown>> | undefined, schema: z.ZodType) {
	const misplaced = Object.entries(described ?? {}).find(
		([, held]) => typeof held === "object" && held !== null && "aka" in held,
	);
	if (misplaced) throw new Error(AKA_LIVES_IN_THE_SCHEMA.replace("{name}", name).split("{field}").join(misplaced[0]));
	const akas = akaOfFields(schema);
	if (!described && Object.keys(akas).length === 0) return undefined;
	const fields = new Set([...Object.keys(described ?? {}), ...Object.keys(akas)]);
	return Object.fromEntries(
		[...fields].map((field) => {
			const held = described?.[field];
			const given = typeof held === "string" ? { label: held } : ((held as Readonly<Record<string, unknown>>) ?? {});
			return [field, akas[field] ? { ...given, aka: akas[field] } : given];
		}),
	);
}

function akaOfFields(schema: z.ZodType): Readonly<Record<string, readonly string[]>> {
	const inner = innerOf(schema);
	if (inner) return akaOfFields(inner);
	if (!(schema instanceof z.ZodObject)) return {};
	const named = Object.entries(schema.shape as Record<string, z.ZodType>).map(
		([field, held]) => [field, akaOf(held)] as const,
	);
	return Object.fromEntries(named.filter(([, aka]) => aka !== undefined)) as Record<string, readonly string[]>;
}

function akaOf(schema: z.ZodType): readonly string[] | undefined {
	const aka = schema.meta()?.["aka"];
	if (Array.isArray(aka)) return aka as readonly string[];
	const inner = innerOf(schema);
	return inner ? akaOf(inner) : undefined;
}

function innerOf(schema: z.ZodType): z.ZodType | undefined {
	const def = (schema as { _zod?: { def?: { innerType?: z.ZodType; in?: z.ZodType } } })._zod?.def;
	return def?.innerType ?? def?.in;
}

function heldSpecOf(declaration: Declaration, described: PropMetadata<unknown>) {
	return { ...declaration.held, ...described };
}

function enumOptions(schema: z.ZodType): readonly Choice[] | undefined {
	if (!(schema instanceof z.ZodEnum)) return undefined;
	return (schema.options as readonly string[]).map((value) => ({ value, label: value }));
}
