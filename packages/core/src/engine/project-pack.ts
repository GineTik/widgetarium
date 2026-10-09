import { z } from "zod";
import { declarationIn } from "../gateway/declaration.js";
import { defineCommandMetadata, defineGatewayMetadata } from "../gateway/implementation-metadata.js";
import type { CommandMetadata, GatewayMetadata, Resource } from "../gateway/implementation-metadata.js";
import type { ImplementationPorts, Pack } from "./packs.js";

export type ImportedHandlers = Readonly<Record<string, unknown>>;

type HandlerClass = new (fields: Readonly<Record<string, unknown>>, ports: ImplementationPorts) => object;

type NamedHandler = readonly [name: string, handler: HandlerClass];

export const PROJECT_PACK_ID = "project";

const PROJECT_PACK_TITLE = "This project";
const PROJECT_RESOURCE: Resource = "This board";
const HandlerFieldsSchema = z.looseObject({});
const HANDLER_DESCRIPTION = "{name}, exported by this project";
const NOT_A_HANDLER = "{name} was found as a handler, but its export is no class extending IQuery or ICommand";

export function projectPackOf(handlers: ImportedHandlers): Pack {
	const named = Object.entries(handlers).flatMap(([name, held]): NamedHandler[] => handlerOf(name, held));
	return {
		id: PROJECT_PACK_ID,
		title: PROJECT_PACK_TITLE,
		queries: named.filter(([, handler]) => !isCommand(handler)).map(queryMetadataOf),
		commands: named.filter(([, handler]) => isCommand(handler)).map(commandMetadataOf),
	};
}

function queryMetadataOf([name, handler]: NamedHandler): GatewayMetadata {
	return defineGatewayMetadata(handler, {
		id: name,
		title: name,
		resource: PROJECT_RESOURCE,
		fields: HandlerFieldsSchema,
	});
}

function commandMetadataOf([name, handler]: NamedHandler): CommandMetadata {
	return defineCommandMetadata(handler, {
		id: name,
		title: name,
		resource: PROJECT_RESOURCE,
		description: HANDLER_DESCRIPTION.replace("{name}", name),
		fields: HandlerFieldsSchema,
		consent: "free",
	});
}

function handlerOf(name: string, held: unknown): NamedHandler[] {
	if (isHandlerClass(held)) return [[name, held]];
	console.error(`[widgetarium] handler ${name} → skipped`, NOT_A_HANDLER.replace("{name}", name));
	return [];
}

function isHandlerClass(held: unknown): held is HandlerClass {
	return declarationIn(held) !== null;
}

function isCommand(handler: HandlerClass): boolean {
	return declarationIn(handler)?.kind === "command";
}
