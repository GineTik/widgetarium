const FITS = 0;
const UNDECLARED = 1;
const SHORT = 2;

export type FitOrder = typeof FITS | typeof UNDECLARED | typeof SHORT;

export interface SlotFit {
	readonly order: FitOrder;
	readonly lacks: string | null;
}

export interface ReactIdentity {
	readonly instance: unknown;
	readonly version: unknown;
}

export interface AcceptingManifest {
	readonly accepts?: Readonly<Record<string, unknown>>;
}

type Held<T> = T | null | undefined;

export function reactClash(parent: Held<ReactIdentity>, child: Held<ReactIdentity>): string | null {
	if (!parent || !child || parent.instance === child.instance) return null;
	return `This widget draws with React ${String(parent.version)} and that one with React ${String(child.version)}. A slot draws inside its parent, so both must be one React.`;
}

// TRADE-OFF: RANK, never filter. `gives` is what the parent DECLARES and drifts from what it builds, so a filter would hide widgets with no reason given.
export function slotFit(
	manifest: Held<AcceptingManifest>,
	gives: Held<Readonly<Record<string, unknown>>>,
	clash: string | null = null,
): SlotFit {
	if (clash) return { order: SHORT, lacks: clash };
	if (!gives || Object.keys(gives).length === 0) return { order: UNDECLARED, lacks: null };
	const accepts = manifest?.accepts ?? {};
	if (Object.keys(accepts).length === 0) return { order: UNDECLARED, lacks: null };

	const missing = missingFrom(accepts, gives);
	if (missing.length === 0) return { order: FITS, lacks: null };
	return { order: SHORT, lacks: `Needs ${missing.join(", ")}` };
}

function missingFrom(accepts: Readonly<Record<string, unknown>>, gives: Readonly<Record<string, unknown>>): unknown[] {
	const missing: unknown[] = [];
	for (const [prop, needed] of Object.entries(accepts)) {
		const handed = gives[prop];
		if (!Array.isArray(handed)) {
			missing.push(prop);
			continue;
		}
		for (const field of requiredOf(needed)) {
			if (!handed.includes(field)) missing.push(field);
		}
	}
	return missing;
}

function requiredOf(needed: unknown): readonly unknown[] {
	if (typeof needed !== "object" || needed === null || !("required" in needed)) return [];
	const { required } = needed;
	return Array.isArray(required) ? required : [];
}
