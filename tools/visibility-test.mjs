import { buildMirror } from "./mirror.mjs";

buildMirror();

const { seenOf, isShown, shownEntries } = await import("./.mjs-cache/prop-visibility.mjs");
const { defineManifest, defineProp } = await import("./.mjs-cache/gateway/manifest.mjs");

let failed = 0;
let checks = 0;
const check = (name, got, want) => {
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

const placed = seenOf(manifest, { props: {} });
const perRow = seenOf(manifest, { props: { fills: { from: "typed", value: "per-row" } } });
const bound = seenOf(manifest, { props: { items: { from: "vault", path: "Sessions" } } });

check("an unset value is seen as its default", placed.fills.value, "placed");
check("a typed value is seen as what was typed", perRow.fills.value, "per-row");
check("an unset prop is not set", placed.fills.isSet, false);
check("a typed prop is set", perRow.fills.isSet, true);
check("a vault binding is named", bound.items.binding, "vault");
check("a collection is seen as rows", placed.items.rows, []);
check("the control is handed over", placed.pageSize.control, "number");

const onlyPerRow = { isVisible: (props) => props.fills.value === "per-row" };
check("a rule reading another prop hides it", isShown(onlyPerRow, placed), false);
check("and shows it when that prop says so", isShown(onlyPerRow, perRow), true);
check("a prop with no rule is always shown", isShown({}, placed), true);
check("a rule returning nothing shows it", isShown({ isVisible: () => undefined }, placed), true);

const logged = [];
const wasError = console.error;
console.error = (...said) => logged.push(said[0]);
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

const held = {
	controls: { label: "Controls" },
	widgets: { label: "Widgets", isVisible: (props) => props.fills.value !== "per-row" },
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

function refusalOf(card) {
	try {
		defineManifest({
			size: { preferredWidth: "full", preferredHeight: "auto" },
			title: "Tried",
			description: "A manifest the engine should refuse.",
			role: "collection",
			props: { rows: defineProp()({ default: [] }) },
			...card,
		});
		return null;
	} catch (thrown) {
		return String(thrown.message);
	}
}

const misspelled = refusalOf({ mounts: { held: { isVisibel: () => false } } });
check("a misspelled isVisible on a mount is refused", misspelled !== null, true);
check("and the refusal names the key", misspelled?.includes("isVisibel"), true);
check("and names the mount it stands on", misspelled?.includes('mount "held"'), true);
check(
	"a slot declaring what the engine reads is accepted",
	refusalOf({ slots: { item: { label: "Item", surface: "none", isVisible: () => true } } }),
	null,
);

console.log(`\n${failed === 0 ? "visibility gate: clean" : `visibility gate: ${failed} of ${checks} failed`}`);
process.exit(failed === 0 ? 0 : 1);
