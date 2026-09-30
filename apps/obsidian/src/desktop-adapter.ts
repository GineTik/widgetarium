import type { DataAdapter } from "obsidian";
import { isObject } from "@widgetarium/core/engine/is-object.js";

export type RequireModule = (name: string) => unknown;

interface BasePathReporter {
	getBasePath(): string;
}

export function basePathHeldBy(adapter: DataAdapter | null | undefined): string | undefined {
	if (!isObject(adapter)) return undefined;
	const held = adapter["basePath"];
	return typeof held === "string" ? held : undefined;
}

export function reportsBasePath(adapter: DataAdapter): adapter is DataAdapter & BasePathReporter {
	return isObject(adapter) && typeof adapter["getBasePath"] === "function";
}

export function windowRequire(): RequireModule | undefined {
	const held: unknown = Reflect.get(window, "require");
	if (typeof held !== "function") return undefined;
	return (name) => Reflect.apply(held, window, [name]);
}
