import { buildMirror } from "./mirror.mjs";

buildMirror();
const { allowedVerbs, withinAllowed } = await import("./.mjs-cache/gateway/props.mjs");
const { arrayGateway, canDo } = await import("./.mjs-cache/gateway/create.mjs");
const { defineManifest, defineProp } = await import("./.mjs-cache/gateway/manifest.mjs");

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const tasks = defineManifest({
	size: { preferredWidth: "full", preferredHeight: "auto" },
	title: "Tasks",
	description: "Tasks.",
	props: { tasks: defineProp()({ label: "Tasks", default: [], writes: ["create", "remove"] }) },
}).props.tasks;
const onVerbs = (decisions) => decisions.filter((decision) => decision.can).map((decision) => decision.verb);

check(
	"a folder bound with no list of its own only reads",
	onVerbs(allowedVerbs(tasks, { from: "vault", path: "Tasks" }, "vault")),
	["list", "get"],
);
check(
	"a folder bound by the person carries what it may do",
	onVerbs(allowedVerbs(tasks, { from: "vault", path: "Tasks", allow: ["list", "get", "create"] }, "vault")),
	["list", "get", "create"],
);
check(
	"rows kept in the tile may do whatever the widget uses",
	onVerbs(allowedVerbs(tasks, { from: "typed", rows: [] }, "hardcode")),
	["list", "get", "create", "remove"],
);
check(
	"a verb the widget never asked for is never offered, allowed or not",
	allowedVerbs(tasks, { allow: ["update"] }, "vault").map((decision) => decision.verb),
	["list", "get", "create", "remove"],
);
check(
	"and a switched-off verb says why",
	allowedVerbs(tasks, { allow: [] }, "vault")[2].reason,
	"create is not switched on for this tile",
);

const rows = arrayGateway(["a"], { create: () => null, remove: () => null }, "allow-test");
const narrowed = withinAllowed(rows, allowedVerbs(tasks, { allow: ["list", "remove"] }, "vault"));
check("a gateway keeps the verbs the tile allows", [canDo(narrowed.list), canDo(narrowed.remove)], [true, true]);
check("and refuses the ones it does not", canDo(narrowed.create), false);
check("the refusal carries the reason", narrowed.create.can().reason, "create is not switched on for this tile");
check(
	"a refused write rejects rather than writing",
	await narrowed.create({}).then(
		() => "wrote",
		() => "refused",
	),
	"refused",
);
check(
	"nothing is wrapped when nothing is cut",
	withinAllowed(rows, allowedVerbs(tasks, { allow: ["list", "create", "remove"] }, "vault")),
	rows,
);

console.log(failed === 0 ? "allow: all passed" : `allow: ${failed} failed`);
if (failed > 0) process.exit(1);
