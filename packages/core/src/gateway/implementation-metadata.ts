import type { z } from "zod";
import type { Kind } from "./declaration";
import { classNameOf, declarationIn, isPortItself } from "./declaration";

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
	"{implementation} extends no gateway interface — extend IQuery.output, IQuery.outputWithin, ICommand.input, IValueGateway, IListGateway or ICrudGateway";

const THE_PORT_ITSELF =
	"the declared port itself was given where a handler class belongs: write class Handler extends IQuery.output(schema) or ICommand.input(schema) and pass Handler";

export function defineGatewayMetadata<C extends Constructed>(
	implementation: C,
	metadata: GatewayMetadataInput<C>,
): GatewayMetadata<C> {
	refusePortItself(implementation);
	const declaration = declarationIn(implementation);
	if (!declaration) throw new Error(EXTENDS_NO_INTERFACE.replace("{implementation}", classNameOf(implementation)));
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

const NOT_A_COMMAND = "{implementation} is not a command implementation — extend ICommand.input(schema)";

export function defineCommandMetadata<C extends Constructed>(
	implementation: C,
	metadata: CommandMetadataInput<C>,
): CommandMetadata<C> {
	refusePortItself(implementation);
	if (declarationIn(implementation)?.kind !== "command")
		throw new Error(NOT_A_COMMAND.replace("{implementation}", classNameOf(implementation)));
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

function refusePortItself(implementation: Constructed): void {
	if (isPortItself(implementation)) throw new Error(THE_PORT_ITSELF);
}
