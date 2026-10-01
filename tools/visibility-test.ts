import type { Seen } from "../packages/core/src/prop-visibility.js";
import type { DeclaredProps } from "../packages/core/src/gateway/declared-types.js";
import type { Described } from "../packages/core/src/gateway/written.js";

const { seenOf, isShown, shownEntries } = await import("../packages/core/src/prop-visibility.js");
const { IListGateway, IMounts, ISlot, defineProps, manifestOfModule, z } =
	await import("../packages/core/src/gateway/declared.ts");

let failed = 0;
let checks = 0;
const check = (name: string, got: unknown, want: unknown): void => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};

const manifest = {
	props: {
		fills: { kind: "value", control: "pick", label: "What fills it", default: { value: "placed" } },
		items: { kind: "collection", label: "The data", default: { rows: [] } },
		pageSize: { kind: "value", control: "number", label: "Rows drawn", default: { value: 24 } },
	},
};

function seenPropOf(seen: Seen, key: string): Seen[string] {
	const prop = seen[key];
	if (!prop) throw new Error(`nothing is seen under ${key}`);
	return prop;
}

const placed = seenOf(manifest, { props: {} });
const perRow = seenOf(manifest, { props: { fills: { from: "typed", value: "per-row" } } });
const bound = seenOf(manifest, { props: { items: { from: "vault", path: "Sessions" } } });

check("an unset value is seen as its default", seenPropOf(placed, "fills").value, "placed");
check("a typed value is seen as what was typed", seenPropOf(perRow, "fills").value, "per-row");
check("an unset prop is not set", seenPropOf(placed, "fills").isSet, false);
check("a typed prop is set", seenPropOf(perRow, "fills").isSet, true);
check("a vault binding is named", seenPropOf(bound, "items").binding, "vault");
check("a collection is seen as rows", seenPropOf(placed, "items").rows, []);
check("the control is handed over", seenPropOf(placed, "pageSize").control, "number");

const onlyPerRow = { isVisible: (props: Seen) => seenPropOf(props, "fills").value === "per-row" };
check("a rule reading another prop hides it", isShown(onlyPerRow, placed), false);
check("and shows it when that prop says so", isShown(onlyPerRow, perRow), true);
check("a prop with no rule is always shown", isShown({}, placed), true);
check("a rule returning nothing shows it", isShown({ isVisible: () => undefined }, placed), true);

const logged: unknown[] = [];
const wasError = console.error;
console.error = (...said: unknown[]): void => {
	logged.push(said[0]);
};
const shownAnyway = isShown(
	{
		isVisible: () => {
			throw new Error("no");
		},
	},
	placed,
);
console.error = wasError;
check("a rule that throws shows the prop rather than hiding it", shownAnyway, true);
check("and says so once", logged.length, 1);

const held: Readonly<Record<string, { readonly label: string; readonly isVisible?: (props: Seen) => boolean }>> = {
	controls: { label: "Controls" },
	widgets: { label: "Widgets", isVisible: (props) => seenPropOf(props, "fills").value !== "per-row" },
};
check(
	"a mount group is filtered by the same rule",
	shownEntries(held, perRow).map(([name]) => name),
	["controls"],
);
check(
	"and stands when the rule allows it",
	shownEntries(held, placed).map(([name]) => name),
	["controls", "widgets"],
);

function refusalOf(held: DeclaredProps, described: Described): string | null {
	try {
		manifestOfModule({
			default: { declared: defineProps({ rows: IListGateway.of(z.unknown()), ...held }) },
			metadata: { title: "Tried", description: "A manifest the engine should refuse.", props: described },
			layout: { role: "collection", size: { preferredWidth: "full", preferredHeight: "auto" } },
		});
		return null;
	} catch (thrown) {
		return String(thrown instanceof Error ? thrown.message : undefined);
	}
}

const misspelledKey: string = "isVisibel";
const misspelled = refusalOf({ held: IMounts.of() }, { held: { [misspelledKey]: () => false } });
check("a misspelled isVisible on a mount is refused", misspelled !== null, true);
check("and the refusal names the key", misspelled?.includes("isVisibel"), true);
check("and names the mount it stands on", misspelled?.includes('mount "held"'), true);
check(
	"a slot declaring what the engine reads is accepted",
	refusalOf({ item: ISlot.of({ surface: "none" }) }, { item: { label: "Item", isVisible: () => true } }),
	null,
);

console.log(`\n${failed === 0 ? "visibility gate: clean" : `visibility gate: ${failed} of ${checks} failed`}`);
process.exit(failed === 0 ? 0 : 1);
