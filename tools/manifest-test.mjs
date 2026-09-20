import { buildMirror } from "./mirror.mjs";

buildMirror();
const { defineManifest, defineProp, migration, verb } = await import("./.mjs-cache/gateway/manifest.mjs");

let failures = 0;

function check(said, held, wanted) {
	const same = JSON.stringify(held) === JSON.stringify(wanted);
	if (!same) failures += 1;
	console.log(
		`${same ? "ok  " : "not ok"} ${said}${same ? "" : `\n      held ${JSON.stringify(held)}\n      want ${JSON.stringify(wanted)}`}`,
	);
}

function refusal(said, run, part) {
	let message = null;
	try {
		run();
	} catch (failure) {
		message = failure.message;
	}
	const refused = message !== null && message.includes(part);
	if (!refused) failures += 1;
	console.log(`${refused ? "ok  " : "not ok"} ${said}${refused ? "" : `\n      held ${message}`}`);
}

const made = defineManifest({
	title: "Probe",
	description: "The widget the manifest checks are measured on.",
	props: {
		heading: defineProp()({ default: "To do" }),
		pageSize: defineProp()({ default: 10, design: true }),
		archivedAt: defineProp()({ default: "" }),
		open: defineProp()({ default: false, keep: "screen", writes: ["update"] }),
		wide: defineProp()({ default: false }),
		note: defineProp()({ default: "", control: "text" }),
		face: defineProp()({ default: "", control: "emoji" }),
		entries: defineProp()({
			default: [],
			writes: ["create", "update"],
			describes: { done: { aka: ["complete"] }, title: "Name" },
		}),
		current: defineProp()({ of: "entries", fallback: "first" }),
		board: defineProp()({ picks: "current", of: "entries" }),
	},
});

check("an array default is a collection", made.props.entries.kind, "collection");
check("anything else is a value", made.props.heading.kind, "value");
check("a string draws a line", made.props.heading.control, "line");
check("a number draws a number", made.props.pageSize.control, "number");
check("a boolean draws a switch", made.props.wide.control, "boolean");
check("a kept value is memory", made.props.open.control, "memory");
check("a written control wins", made.props.note.control, "text");
check("an emoji is stored as a line", made.props.face.type, "line");
check("of alone is a pick", made.props.current.control, "pick");
check("picks with of is the row", made.props.board.control, "row");
check("a label is read off the key", made.props.pageSize.label, "Page size");
check("a two-word key is spaced", made.props.archivedAt.label, "Archived at");
check("reads are never declared", made.props.entries.writes, ["list", "get", "create", "update"]);
check("a value reads with get", made.props.heading.writes, ["get"]);
check("a written value keeps its update", made.props.open.writes, ["get", "update"]);
check("a list default is stored under rows", made.props.entries.default, { rows: [] });
check("a value default is stored under value", made.props.heading.default, { value: "To do" });
check("a kept value says where it lives", made.props.open.default, { from: "memory", value: false });
check("a described field is an object", made.props.entries.describes.title, { label: "Name" });
check("the card carries no writes of its own", made.writes, undefined);

refusal(
	"a prop that is not defineProp is refused",
	() => defineManifest({ title: "Probe", description: "x", props: { notes: { default: [] } } }),
	"is not made by defineProp",
);
refusal(
	"a default naming a path is refused",
	() =>
		defineManifest({
			title: "Probe",
			description: "x",
			props: { notes: defineProp()({ default: { path: "Tasks" } }) },
		}),
	"defaults to a vault path",
);
refusal(
	"a default whose rows name a path is refused too",
	() =>
		defineManifest({
			title: "Probe",
			description: "x",
			props: { notes: defineProp()({ default: [{ path: "Tasks/one.md" }] }) },
		}),
	"defaults to a vault path",
);
refusal(
	"a path nested inside a default is refused too",
	() =>
		defineManifest({
			title: "Probe",
			description: "x",
			props: { notes: defineProp()({ default: { change: { path: "Tasks/one.md" } } }) },
		}),
	"defaults to a vault path",
);
refusal(
	"a default object naming ref is refused, not only rows",
	() =>
		defineManifest({
			title: "Probe",
			description: "x",
			props: { notes: defineProp()({ default: { ref: "abc", title: "One" } }) },
		}),
	"data carrying ref",
);
refusal(
	"a prop with no default is refused",
	() => defineManifest({ title: "Probe", description: "x", props: { notes: defineProp()({ label: "Notes" }) } }),
	"declares no default",
);
refusal(
	"a described ref is refused",
	() =>
		defineManifest({
			title: "Probe",
			description: "x",
			props: { notes: defineProp()({ default: [], describes: { ref: "Address" } }) },
		}),
	"ref is the engine's name",
);
refusal(
	"a default row carrying a ref is refused",
	() =>
		defineManifest({
			title: "Probe",
			description: "x",
			props: { notes: defineProp()({ default: [{ ref: "r1", name: "One" }] }) },
		}),
	"minted by the engine",
);
refusal(
	"an own verb with no type is refused",
	() =>
		defineManifest({
			title: "Probe",
			description: "x",
			props: { notes: defineProp()({ default: [], writes: { archive: true } }) },
		}),
	"verb<Input, Output>()",
);
refusal(
	"a migration from nothing is refused",
	() =>
		defineManifest({
			title: "Probe",
			description: "x",
			props: { notes: defineProp()({ default: [] }) },
			migrate: [migration({ from: {}, run: () => ({}) })],
		}),
	"names no props it migrates from",
);

const withOwnVerb = defineManifest({
	title: "Probe",
	description: "x",
	props: { notes: defineProp()({ default: [], writes: { create: true, archive: verb() } }) },
});
check("an own verb joins the writes", withOwnVerb.props.notes.writes, ["list", "get", "create", "archive"]);

console.log(failures === 0 ? "manifest: every check passed" : `manifest: ${failures} checks red`);
process.exit(failures === 0 ? 0 : 1);
