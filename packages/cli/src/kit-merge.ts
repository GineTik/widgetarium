import { type KitLayout, byPath, groupFileOf, groupSpecifierOf, resolvedModuleOf } from "./kit-layout.js";
import { type KitModule, type LinkedName, type ModuleLink, refuseUnmergeable } from "./kit-source.js";
import { type LinkEntry, type MergedLinks, mergedLinksOf, renderHead, renderTail } from "./kit-merged-links.js";

interface MergingGroup {
	readonly name: string;
	readonly file: string;
	readonly layout: KitLayout;
	readonly members: ReadonlySet<KitModule>;
}

type Provider = { readonly local: string } | { readonly specifier: string; readonly name: string };

export function mergeGroup(layout: KitLayout, name: string, members: readonly KitModule[]): string {
	const group: MergingGroup = { name, file: groupFileOf(name, members), layout, members: new Set(members) };
	const ordered = inDependencyOrder(group);
	assertNotDeclaredTwice(group, ordered);
	const exportsDefault = ordered.find((member) => member.exportsDefault);
	if (exportsDefault !== undefined) refuseUnmergeable(exportsDefault.path, "has a default export");
	const links = mergedLinksOf(
		group.file,
		nativeExportsOf(ordered),
		ordered.flatMap((member) => keptLinksOf(group, member)),
	);
	assertNoImportShadowing(group, ordered, links);
	return joinSections([renderHead(links), ...ordered.map(bodyOf), renderTail(links)]);
}

function keptLinksOf(group: MergingGroup, member: KitModule): LinkEntry[] {
	return member.links.flatMap((link) => {
		const kind = link.kind === "reexport-all" ? refuseUnmergeable(member.path, "re-exports everything") : link.kind;
		if (link.names.length === 0) refuseUnmergeable(member.path, `links ${link.specifier} without naming anything`);
		const target = memberReachedBy(group, member, link);
		if (target === null)
			return [{ kind, specifier: groupSpecifierOf(group.layout, member.path, link.specifier), names: link.names }];
		return link.names.flatMap((linked) =>
			entriesOfPartLink({ group, member, kind, linked }, providerOf(group, target, linked.name)),
		);
	});
}

interface PartLink {
	readonly group: MergingGroup;
	readonly member: KitModule;
	readonly kind: "import" | "reexport";
	readonly linked: LinkedName;
}

function entriesOfPartLink({ group, member, kind, linked }: PartLink, provider: Provider): LinkEntry[] {
	if ("specifier" in provider)
		return [{ kind, specifier: provider.specifier, names: [{ ...linked, name: provider.name }] }];
	if (kind === "reexport")
		return [{ kind: "local-export", specifier: "", names: [{ ...linked, name: provider.local }] }];
	if (provider.local !== linked.as) {
		return refuseUnmergeable(member.path, `imports ${provider.local} from a part of ${group.name} under another name`);
	}
	return [];
}

function providerOf(group: MergingGroup, member: KitModule, exportedName: string): Provider {
	const local = member.exported.get(exportedName);
	if (local !== undefined) return { local };
	const link = member.links.find(
		(each) => each.kind === "reexport" && each.names.some(({ as }) => as === exportedName),
	);
	const linked = link?.names.find(({ as }) => as === exportedName);
	if (link === undefined || linked === undefined)
		return refuseUnmergeable(member.path, `does not export ${exportedName}`);
	const target = memberReachedBy(group, member, link);
	if (target !== null) return providerOf(group, target, linked.name);
	return { specifier: groupSpecifierOf(group.layout, member.path, link.specifier), name: linked.name };
}

function memberReachedBy(group: MergingGroup, member: KitModule, link: ModuleLink): KitModule | null {
	const target = resolvedModuleOf(group.layout, member.path, link.specifier);
	return target !== null && group.members.has(target) ? target : null;
}

function inDependencyOrder(group: MergingGroup): KitModule[] {
	const waiting = new Map([...group.members].map((member) => [member, dependenciesOf(group, member)]));
	const ordered: KitModule[] = [];
	for (;;) {
		const ready = [...waiting].filter(([, needs]) => [...needs].every((need) => !waiting.has(need)));
		const next = (ready.length > 0 ? ready : [...waiting]).map(([member]) => member).sort(byPath)[0];
		if (next === undefined) return ordered;
		ordered.push(next);
		waiting.delete(next);
	}
}

function dependenciesOf(group: MergingGroup, member: KitModule): Set<KitModule> {
	const imports = member.links.filter((link) => link.kind === "import");
	return new Set(imports.flatMap((link) => memberReachedBy(group, member, link) ?? []));
}

function assertNotDeclaredTwice(group: MergingGroup, ordered: readonly KitModule[]): void {
	const owners = new Map<string, string>();
	for (const member of ordered) {
		for (const name of new Set(member.declared)) {
			const owner = owners.get(name);
			if (owner !== undefined)
				refuseUnmergeable(member.path, `declares ${name}, which ${owner} declares too, in ${group.name}`);
			owners.set(name, member.path);
		}
	}
}

function assertNoImportShadowing(group: MergingGroup, ordered: readonly KitModule[], links: MergedLinks): void {
	for (const member of ordered) {
		const shadowed = member.declared.find((name) => links.importedLocals.has(name));
		if (shadowed !== undefined)
			refuseUnmergeable(member.path, `declares ${shadowed}, which another part of ${group.name} imports`);
	}
}

function nativeExportsOf(ordered: readonly KitModule[]): Map<string, string> {
	return new Map(ordered.flatMap((member) => [...member.exported]));
}

function bodyOf(member: KitModule): string {
	const cut = [...member.links].sort((left, right) => right.range.start - left.range.start);
	const kept = cut.reduce((text, { range }) => `${text.slice(0, range.start)}${text.slice(range.end)}`, member.text);
	return kept.replace(/\n{3,}/g, "\n\n").trim();
}

function joinSections(sections: readonly string[]): string {
	return `${sections.filter((section) => section.length > 0).join("\n\n")}\n`;
}
