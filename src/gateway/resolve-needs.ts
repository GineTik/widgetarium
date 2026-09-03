import type { FieldReport, FieldType } from "./fields";

export interface DeclaredNeed {
	type: FieldType;
	many?: boolean;
	required?: boolean;
	aka?: string[];
	was?: string;
}

export type DeclaredNeeds = Record<string, DeclaredNeed>;

export type ChosenProps = Record<string, string>;

export interface Resolution {
	map: Record<string, string>;
	unresolved: string[];
	missing: string[];
}

const plainly = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

function namesOf(need: string, declared: DeclaredNeed): string[] {
	return [need, ...(declared.was ? [declared.was] : []), ...(declared.aka ?? [])];
}

// TRADE-OFF: a need for many takes a field that holds one, and a field whose other values are junk, because coercion drops them; a need for one refuses a list rather than picking from it
function fits(field: FieldReport, declared: DeclaredNeed): boolean {
	if (declared.many) return field.typesSeen.includes(declared.type);
	return !field.many && field.elementType === declared.type;
}

function namedExactly(fields: readonly FieldReport[], names: readonly string[], declared: DeclaredNeed): FieldReport | null {
	for (const name of names) {
		const found = fields.find((field) => field.prop === name && fits(field, declared));
		if (found) return found;
	}
	return null;
}

function namedPlainly(fields: readonly FieldReport[], names: readonly string[], declared: DeclaredNeed): FieldReport | null {
	const wanted = new Set(names.map(plainly));
	const found = fields.filter((field) => wanted.has(plainly(field.prop)) && fits(field, declared));
	return found.length === 1 ? found[0] : null;
}

function theOnlyFieldThatFits(fields: readonly FieldReport[], declared: DeclaredNeed): FieldReport | null {
	const found = fields.filter((field) => fits(field, declared));
	return found.length === 1 ? found[0] : null;
}

function namedFor(need: string, declared: DeclaredNeed, fields: readonly FieldReport[]): string | null {
	const names = namesOf(need, declared);
	return (namedExactly(fields, names, declared) ?? namedPlainly(fields, names, declared))?.prop ?? null;
}

function resolvedByName(needs: DeclaredNeeds, fields: readonly FieldReport[], chosen: ChosenProps): Record<string, string> {
	const map: Record<string, string> = {};
	for (const [need, declared] of Object.entries(needs)) {
		const picked = chosen[need] ?? namedFor(need, declared, fields);
		if (picked) map[need] = picked;
	}
	return map;
}

function resolvedByType(needs: DeclaredNeeds, fields: readonly FieldReport[], map: Record<string, string>): void {
	const claimed = new Set(Object.values(map));
	for (const [need, declared] of Object.entries(needs)) {
		if (map[need]) continue;
		const found = theOnlyFieldThatFits(
			fields.filter((field) => !claimed.has(field.prop)),
			declared,
		);
		if (!found) continue;
		map[need] = found.prop;
		claimed.add(found.prop);
	}
}

// TRADE-OFF: one property answers at most one need — without that, a lone text field is claimed by every text need at once
export function resolveNeeds(needs: DeclaredNeeds, fields: readonly FieldReport[], chosen: ChosenProps = {}): Resolution {
	const map = resolvedByName(needs, fields, chosen);
	resolvedByType(needs, fields, map);
	const unresolved = Object.keys(needs).filter((need) => !map[need]);
	return { map, unresolved, missing: unresolved.filter((need) => needs[need].required) };
}
