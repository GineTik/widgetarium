import { bindingOf, declaredOf, typedIn } from "./gateway/props.js";
import { propConfig } from "./model.js";

const isCollection = (spec) => spec?.kind === "collection";

const heldBy = (spec, typed) => (typed === undefined ? declaredOf(spec) : typed);

const wasChosen = (typed, config) => typed !== undefined || Boolean(config?.path) || Boolean(config?.ref);

function dataSeen(spec, held) {
	if (!isCollection(spec)) return { value: held ?? null };
	return { rows: Array.isArray(held) ? held : [] };
}

function seenProp(spec, config) {
	const typed = typedIn(spec, config);
	return {
		kind: isCollection(spec) ? "collection" : "value",
		control: spec?.control ?? null,
		binding: bindingOf(spec, config).binding,
		isSet: wasChosen(typed, config),
		...dataSeen(spec, heldBy(spec, typed)),
	};
}

export function seenOf(manifest, tile) {
	return Object.fromEntries(
		Object.entries(manifest?.props ?? {}).map(([key, spec]) => [key, seenProp(spec, propConfig(tile, key, spec))]),
	);
}

const VISIBILITY_THREW = "[widgetarium] isVisible threw, so what it would hide is drawn:";

export function isShown(spec, seen) {
	if (typeof spec?.isVisible !== "function") return true;
	try {
		return spec.isVisible(seen) !== false;
	} catch (thrown) {
		console.error(VISIBILITY_THREW, thrown);
		return true;
	}
}

export function shownEntries(declared, seen) {
	return Object.entries(declared ?? {}).filter(([, spec]) => isShown(spec, seen));
}
