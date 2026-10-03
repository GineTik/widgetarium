import type { z } from "zod";
import type { DeclaringWord, Kind } from "./declaration";
import { WIDGET_WORDS, declarationIn } from "./declaration";

type Constructed = new (fields: never, host: never) => object;

export const RESOURCES = [
	"This board",
	"Another widget",
	"Note",
	"Folder",
	"Search",
	"Statistics",
	"Web",
	"Git",
	"Catalogue",
	"Console",
] as const;

export type Resource = (typeof RESOURCES)[number];

type FieldsOf<C extends Constructed> = ConstructorParameters<C>[0];

export interface GatewayMetadata<C extends Constructed = Constructed> {
	readonly implementation: C;
	readonly id: string;
	readonly title: string;
	readonly resource: Resource;
	readonly description?: string;
	readonly fields: z.ZodType;
	readonly kind: Kind;
}

export interface GatewayMetadataInput<C extends Constructed> {
	readonly id: string;
	readonly title: string;
	readonly resource: Resource;
	readonly description?: string;
	readonly fields: z.ZodType<FieldsOf<C>>;
}

const EXTENDS_NO_INTERFACE =
	"{implementation} extends no gateway interface — extend IQuery.returns, IQuery.returnsAny, ICommand.takes, IValueGateway, IListGateway or ICrudGateway";

const WIDGET_WORD_IN_IMPLEMENTATION =
	"{implementation} extends {word}, the word a widget declares: an implementation extends {fits}";

export function defineGatewayMetadata<C extends Constructed>(
	implementation: C,
	metadata: GatewayMetadataInput<C>,
): GatewayMetadata<C> {
	const declaration = declarationIn(implementation);
	if (!declaration)
		throw new Error(EXTENDS_NO_INTERFACE.replace("{implementation}", implementation.name || "this class"));
	refuseWidgetWord(implementation, declaration.word);
	refuseUnknownResource(metadata);
	return { ...metadata, implementation, kind: declaration.kind };
}

export type CommandTargetKind = "collection" | "value";

export type CommandConsent = "free" | "vault-target" | "always";

export interface CommandMetadata<C extends Constructed = Constructed> {
	readonly implementation: C;
	readonly id: string;
	readonly title: string;
	readonly resource: Resource;
	readonly description: string;
	readonly fields: z.ZodType;
	readonly target: CommandTargetKind | null;
	readonly consent: CommandConsent;
}

export interface CommandMetadataInput<C extends Constructed> {
	readonly id: string;
	readonly title: string;
	readonly resource: Resource;
	readonly description: string;
	readonly fields: z.ZodType<FieldsOf<C>>;
	readonly target?: CommandTargetKind;
	readonly consent?: CommandConsent;
}

const UNKNOWN_RESOURCE = '{id} names the resource "{resource}"; name one of {resources}';

const NOT_A_COMMAND = "{implementation} is not a command implementation — extend ICommand.takes(schema)";

export function defineCommandMetadata<C extends Constructed>(
	implementation: C,
	metadata: CommandMetadataInput<C>,
): CommandMetadata<C> {
	const declaration = declarationIn(implementation);
	if (declaration?.kind !== "command" || declaration.word !== "takes")
		throw new Error(NOT_A_COMMAND.replace("{implementation}", implementation.name || "this class"));
	refuseUnknownResource(metadata);
	return { ...metadata, implementation, target: metadata.target ?? null, consent: metadata.consent ?? "always" };
}

export function inResourceOrder<Entry extends { readonly resource: Resource }>(entries: readonly Entry[]): Entry[] {
	return [...entries].sort((one, other) => RESOURCES.indexOf(one.resource) - RESOURCES.indexOf(other.resource));
}

function refuseUnknownResource({ id, resource }: { readonly id: string; readonly resource: unknown }): void {
	if (RESOURCES.some((known) => known === resource)) return;
	throw new Error(
		UNKNOWN_RESOURCE.replace("{id}", id)
			.replace("{resource}", String(resource))
			.replace("{resources}", RESOURCES.join(", ")),
	);
}

function refuseWidgetWord(implementation: Constructed, word: DeclaringWord | undefined): void {
	if (!word || !WIDGET_WORDS.includes(word)) return;
	throw new Error(
		WIDGET_WORD_IN_IMPLEMENTATION.replace("{implementation}", implementation.name || "this class")
			.replace("{word}", word === "sends" ? "ICommand.sends" : "IQuery.expects")
			.replace("{fits}", word === "sends" ? "ICommand.takes" : "IQuery.returns or IQuery.returnsAny"),
	);
}
