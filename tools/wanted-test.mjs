import { buildMirror } from "./mirror.mjs";

buildMirror();

const { createWantedWidgets } = await import("./.mjs-cache/engine/widgets-wanted.mjs");
const { widgetsNamedBy } = await import("./.mjs-cache/templates.mjs");
const { widgetKeyOf } = await import("./.mjs-cache/engine/widget-ref.mjs");

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

function installerFake(how, held, log) {
	return async (id) => {
		if (how.throws) throw new Error(how.throws);
		log.installed.push(id);
		const key = widgetKeyOf(id);
		if (!how.offering.includes(key)) return { ok: false, failure: `no source this vault reads offers ${key}` };
		if (id === how.failsAt) return { ok: false, failure: how.installFailure };
		if (!how.landsNothing) held.add(key);
		return { ok: true, failure: null };
	};
}

function vault(how) {
	const held = new Set(how.holds ?? []);
	const log = { installed: [], stepped: [], rereads: 0, told: [] };
	const wanted = createWantedWidgets({
		isHeld: (id) => held.has(id) || held.has(widgetKeyOf(id)),
		installOne: installerFake({ offering: [], installFailure: "", ...how }, held, log),
		reread: async () => {
			log.rereads += 1;
		},
		onInstalled: (ids) => log.told.push(...ids),
	});
	return { wanted, log, held };
}

const board = {
	tiles: [
		{ id: "a", widget: "@flow/report" },
		{ id: "b", widget: "@default/kanban-board", slots: { card: { widget: "@default/task-card" } } },
		{ id: "c" },
	],
};

check("every widget a board names is collected, slots included", widgetsNamedBy(board.tiles).sort(), [
	"@default/kanban-board",
	"@default/task-card",
	"@flow/report",
]);

const plain = vault({ offering: ["@flow/report"] });
await plain.wanted.want(["@flow/report"]);
check("a widget the board names is fetched", plain.log.installed, ["@flow/report"]);
check("and the vault is reread", plain.log.rereads, 1);
check("and the person is told what arrived", plain.log.told, ["@flow/report"]);

const pinned = vault({ offering: ["@flow/report"] });
await pinned.wanted.want(["@flow/report@9f2c1a4"]);
check("a tile pinned to a commit is fetched, not refused", pinned.wanted.refusalOf("@flow/report@9f2c1a4"), null);
check("and the pinned ref is what the installer is asked for", pinned.log.installed, ["@flow/report@9f2c1a4"]);

const again = vault({ holds: ["@flow/report"], offering: ["@flow/report"] });
await again.wanted.want(["@flow/report"]);
check("a widget already held is never fetched", again.log.installed, []);
check("and nothing is reread for it", again.log.rereads, 0);

const twice = vault({ offering: ["@flow/report"] });
await twice.wanted.want(["@flow/report"]);
await twice.wanted.want(["@flow/report"]);
check("a redraw after a fetch does not fetch again", twice.log.installed, ["@flow/report"]);

const unknown = vault({ offering: [] });
await unknown.wanted.want(["@you/invented"]);
check(
	"a widget no catalogue offers is refused with the installer's reason",
	unknown.wanted.refusalOf("@you/invented"),
	"no source this vault reads offers @you/invented",
);
await unknown.wanted.want(["@you/invented"]);
check("and it is never asked for a second time", unknown.log.installed, ["@you/invented"]);

const broken = vault({
	offering: ["@flow/report"],
	failsAt: "@flow/report",
	installFailure: "the registry answered 403",
});
await broken.wanted.want(["@flow/report"]);
await broken.wanted.want(["@flow/report"]);
check("a failed install is tried once", broken.log.installed, ["@flow/report"]);
check("and the reason is kept", broken.wanted.refusalOf("@flow/report"), "the registry answered 403");

const partly = vault({
	offering: ["@flow/report", "@flow/git-tree"],
	failsAt: "@flow/git-tree",
	installFailure: "the registry answered 403",
});
await partly.wanted.want(["@flow/report", "@flow/git-tree"]);
check("a batch where one fails still rereads the vault", partly.log.rereads, 1);
check("the one that landed is held", partly.held.has("@flow/report"), true);
check("and it is not refused", partly.wanted.refusalOf("@flow/report"), null);
check("only the one that failed is refused", partly.wanted.refusalOf("@flow/git-tree"), "the registry answered 403");
check("and the person is told about the one that landed", partly.log.told, ["@flow/report"]);

const mixedReasons = vault({ offering: ["@flow/report"], failsAt: "@flow/report", installFailure: "disk full" });
await mixedReasons.wanted.want(["@flow/report", "@you/invented"]);
check(
	"each widget keeps its own reason",
	[mixedReasons.wanted.refusalOf("@flow/report"), mixedReasons.wanted.refusalOf("@you/invented")],
	["disk full", "no source this vault reads offers @you/invented"],
);

const thrown = vault({ offering: ["@flow/report"], throws: "the network went away" });
await thrown.wanted.want(["@flow/report"]);
check(
	"a thrown install is caught and the reason kept",
	thrown.wanted.refusalOf("@flow/report"),
	"the network went away",
);
check("and the vault is reread in case something landed", thrown.log.rereads, 1);

const hollow = vault({ offering: ["@flow/report"], landsNothing: true });
await hollow.wanted.want(["@flow/report"]);
await hollow.wanted.want(["@flow/report"]);
check("an install that lands nothing is not retried forever", hollow.log.installed, ["@flow/report"]);
check(
	"and it is refused by name",
	hollow.wanted.refusalOf("@flow/report"),
	"@flow/report installed without landing in the vault, so it will not be asked for again",
);

const mixed = vault({ holds: ["@default/task-card"], offering: ["@flow/report"] });
await mixed.wanted.want(["@flow/report", "@default/task-card", "@you/invented"]);
check("a vault holding one of them is asked only for the rest", mixed.log.installed, ["@flow/report", "@you/invented"]);

const stepped = vault({ offering: ["@flow/report", "@flow/git-tree"] });
await stepped.wanted.want(["@flow/report", "@flow/git-tree"], (id) => stepped.log.stepped.push(id));
check("every entry is stepped through so a progress caller can follow", stepped.log.stepped, [
	"@flow/report",
	"@flow/git-tree",
]);

const racing = vault({ offering: ["@flow/report"] });
await Promise.all([racing.wanted.want(["@flow/report"]), racing.wanted.want(["@flow/report"])]);
check("two blocks drawing at once fetch it once", racing.log.installed, ["@flow/report"]);

console.log(failed ? `\nwanted gate: ${failed} of ${checks} failed` : `\nwanted gate: clean, ${checks} checks`);
process.exit(failed ? 1 : 0);
