import type { ProjectAliases } from "@widgetarium/core/project/index.js";

export interface ResolvedAlias {
	readonly find: RegExp;
	readonly replacement: string;
}

const FILE_TARGET = /\.[^/]+$/;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\/]/g;

export function tsconfigPathsOf(aliases: ProjectAliases): Record<string, string[]> {
	return Object.fromEntries(
		Object.entries(aliases).flatMap(([alias, target]): [string, string[]][] => {
			const exact: [string, string[]] = [alias, [`./${target}`]];
			return isFileTarget(target) ? [exact] : [exact, [`${alias}/*`, [`./${target}/*`]]];
		}),
	);
}

export function viteAliasesOf(aliases: ProjectAliases, root: string): ResolvedAlias[] {
	const literalRoot = root.replaceAll("$", "$$$$");
	return Object.entries(aliases).map(([alias, target]) =>
		isFileTarget(target)
			? { find: new RegExp(`^${escaped(alias)}$`), replacement: `${literalRoot}/${target}` }
			: { find: new RegExp(`^${escaped(alias)}(/.*)?$`), replacement: `${literalRoot}/${target}$1` },
	);
}

function isFileTarget(target: string): boolean {
	return FILE_TARGET.test(target);
}

function escaped(alias: string): string {
	return alias.replace(REGEX_SPECIAL, "\\$&");
}
