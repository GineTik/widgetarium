import { bindingOf, declaredOf, typedIn } from "./gateway/props.js";
import type { DeclaredProp, PropBinding, PropConfig } from "./gateway/props.js";
import { propConfig } from "./model.js";
import type { TileProps } from "./model.js";

export interface VisibleSpec {
	readonly isVisible?: unknown;
}

export interface SeenSpec extends DeclaredProp, VisibleSpec {
	readonly control?: unknown;
	readonly aka?: unknown;
}

export interface SeenData {
	readonly value?: unknown;
	readonly rows?: readonly unknown[];
}

export interface SeenProp extends SeenData {
	readonly kind: "collection" | "value";
	readonly control: unknown;
	readonly binding: PropBinding;
	readonly isSet: boolean;
}

export type Seen = Readonly<Record<string, SeenProp>>;

const VISIBILITY_THREW = "[widgetarium] isVisible threw, so what it would hide is drawn:";

export function seenOf(
	manifest: { readonly props?: Readonly<Record<string, SeenSpec | null | undefined>> | null } | null | undefined,
	tile: { readonly props?: TileProps } | null | undefined,
): Seen {
	return Object.fromEntries(
		Object.entries(manifest?.props ?? {}).map(([key, spec]) => [key, seenProp(spec, propConfig(tile, key, spec))]),
	);
}

export function isShown(spec: VisibleSpec | null | undefined, seen: unknown): boolean {
	const isVisible = spec?.isVisible;
	if (typeof isVisible !== "function") return true;
	try {
		return isVisible(seen) !== false;
	} catch (thrown) {
		console.error(VISIBILITY_THREW, thrown);
		return true;
	}
}

export function shownEntries<Spec extends VisibleSpec>(
	declared: Readonly<Record<string, Spec>> | null | undefined,
	seen: unknown,
): [string, Spec][] {
	return Object.entries(declared ?? {}).filter(([, spec]) => isShown(spec, seen));
}

const isCollection = (spec: SeenSpec | null | undefined): boolean => spec?.kind === "collection";

const heldBy = (spec: SeenSpec | null | undefined, typed: unknown): unknown =>
	typed === undefined ? declaredOf(spec) : typed;

const wasChosen = (typed: unknown, config: PropConfig): boolean =>
	typed !== undefined || Boolean(config.path) || Boolean(config.ref);

function dataSeen(spec: SeenSpec | null | undefined, held: unknown): SeenData {
	if (!isCollection(spec)) return { value: held ?? null };
	return { rows: Array.isArray(held) ? held : [] };
}

function seenProp(spec: SeenSpec | null | undefined, config: PropConfig): SeenProp {
	const typed = typedIn(spec, config);
	return {
		kind: isCollection(spec) ? "collection" : "value",
		control: spec?.control ?? null,
		binding: bindingOf(spec, config).binding,
		isSet: wasChosen(typed, config),
		...dataSeen(spec, heldBy(spec, typed)),
	};
}
