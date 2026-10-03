import { z } from "zod";
import { declarationIn } from "../gateway/declaration.js";
import type { GatewayMetadata } from "../gateway/implementation-metadata.js";
import { innerOf } from "../gateway/written.js";
import { isObject } from "./is-object.js";
import type { HostSpec } from "./host-context.js";

const SCHEMA_OF_CONTROL: Readonly<Record<string, (schema: z.ZodType) => boolean>> = {
	number: (schema) => schema instanceof z.ZodNumber,
	line: (schema) => schema instanceof z.ZodString,
	text: (schema) => schema instanceof z.ZodString,
	boolean: (schema) => schema instanceof z.ZodBoolean,
};

export function isFitFor(entry: GatewayMetadata, spec: HostSpec | null | undefined): boolean {
	const declared = declarationIn(entry.implementation);
	if (!declared?.isQuery || declared.isBound) return true;
	const output = coreOf(declared.schema);
	if (entry.kind === "value") return valueFits(output, controlOf(spec));
	if (!(output instanceof z.ZodObject)) return true;
	const shape: Record<string, unknown> = output.shape;
	return Object.entries(spec?.describes ?? {}).every(
		([field, described]) => field in shape || akaOf(described).some((name) => name in shape),
	);
}

function valueFits(output: z.ZodType, control: string | null): boolean {
	const fits = control ? SCHEMA_OF_CONTROL[control] : undefined;
	return fits ? fits(output) : true;
}

function controlOf(spec: HostSpec | null | undefined): string | null {
	const control: unknown = isObject(spec) ? (spec["control"] ?? spec["type"]) : undefined;
	return typeof control === "string" ? control : null;
}

function akaOf(described: unknown): string[] {
	const aka = isObject(described) ? described["aka"] : undefined;
	return Array.isArray(aka) ? aka.filter((name): name is string => typeof name === "string") : [];
}

function coreOf(schema: z.ZodType): z.ZodType {
	const inner = innerOf(schema);
	return inner ? coreOf(inner) : schema;
}
