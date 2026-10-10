import path from "node:path";
import type { KitModule } from "./kit-source.js";

export interface KitLayout {
	readonly groups: ReadonlyMap<string, readonly KitModule[]>;
	readonly modules: ReadonlyMap<string, KitModule>;
	readonly groupByPath: ReadonlyMap<string, string>;
}

const KIT_BARREL = "index.ts";
const COMPONENT_PATH = /^components\/([^/]+)\.tsx?$/;
const TOP_LEVEL_MODULE = /^[^/]+$/;
const RESOLVED_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const GROUP_JOINER = "-";

export function kitLayoutOf(modules: ReadonlyMap<string, KitModule>): KitLayout {
	const roots = publicComponentsOf(modules);
	const groups = new Map<string, KitModule[]>();
	const groupByPath = new Map<string, string>();
	for (const module of [...modules.values()].sort(byPath)) {
		const component = componentNameOf(module.path);
		if (component === null) continue;
		const group = groupOf(component, roots);
		groups.set(group, [...(groups.get(group) ?? []), module]);
		groupByPath.set(module.path, group);
	}
	return { groups, modules, groupByPath };
}

export function groupFileOf(group: string, members: readonly KitModule[]): string {
	const extension = members.some((member) => member.path.endsWith(".tsx")) ? ".tsx" : ".ts";
	return `components/${group}${extension}`;
}

export function resolvedModuleOf(layout: KitLayout, from: string, specifier: string): KitModule | null {
	return moduleAt(layout.modules, from, specifier);
}

export function byPath(left: KitModule, right: KitModule): number {
	return left.path < right.path ? -1 : 1;
}

export function groupSpecifierOf(layout: KitLayout, from: string, specifier: string): string {
	const target = resolvedModuleOf(layout, from, specifier);
	const component = target === null ? null : componentNameOf(target.path);
	const group = target === null ? undefined : layout.groupByPath.get(target.path);
	if (component === null || group === undefined || group === component) return specifier;
	return `${path.posix.dirname(specifier)}/${group}`;
}

function publicComponentsOf(modules: ReadonlyMap<string, KitModule>): Set<string> {
	const roots = new Set<string>();
	collectRoots(modules, KIT_BARREL, roots, new Set<string>());
	return roots;
}

function collectRoots(
	modules: ReadonlyMap<string, KitModule>,
	modulePath: string,
	roots: Set<string>,
	visited: Set<string>,
): void {
	const module = modules.get(modulePath);
	if (module === undefined || visited.has(modulePath)) return;
	visited.add(modulePath);
	for (const reached of reexportedModulesOf(modules, module)) {
		const component = componentNameOf(reached.path);
		if (component !== null) roots.add(component);
		else if (TOP_LEVEL_MODULE.test(reached.path)) collectRoots(modules, reached.path, roots, visited);
	}
}

function reexportedModulesOf(modules: ReadonlyMap<string, KitModule>, module: KitModule): KitModule[] {
	return module.links
		.filter((each) => each.kind !== "import")
		.map((link) => moduleAt(modules, module.path, link.specifier))
		.filter((reached): reached is KitModule => reached !== null);
}

function moduleAt(modules: ReadonlyMap<string, KitModule>, from: string, specifier: string): KitModule | null {
	if (!specifier.startsWith(".")) return null;
	const bare = path.posix.join(path.posix.dirname(from), specifier);
	const found = RESOLVED_SUFFIXES.map((suffix) => modules.get(`${bare}${suffix}`));
	return found.find((module) => module !== undefined) ?? null;
}

function groupOf(component: string, roots: ReadonlySet<string>): string {
	if (roots.has(component)) return component;
	const owners = [...roots].filter((root) => component.startsWith(`${root}${GROUP_JOINER}`));
	return owners.sort((left, right) => right.length - left.length)[0] ?? component;
}

function componentNameOf(modulePath: string): string | null {
	return COMPONENT_PATH.exec(modulePath)?.[1] ?? null;
}
