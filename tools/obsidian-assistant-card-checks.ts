import type { JobsDoor, ObsidianAssistantPort } from "../apps/obsidian/src/ai/assistant-port-obsidian.ts";
import type { SpecPort } from "../apps/obsidian/src/ai/spec-port.ts";
import type { AssistantSession, ProgressWidget } from "../packages/core/src/engine/assistant-port.ts";
import { JobSchema } from "../packages/core/src/app-jobs.ts";
import type { Job } from "../packages/core/src/app-jobs.ts";

export interface FakeJobs extends JobsDoor {
	bump(): void;
}

interface CardDoorsFake {
	readonly port: ObsidianAssistantPort;
	readonly jobs: FakeJobs;
	readonly asked: string[];
}

type Check = (what: string, held: unknown, wanted: unknown) => void;

export const PROGRESS: ProgressWidget = { definition: null, refusal: "not in this vault" };
const SPEC_FILE = ".widgetarium/apps/Farm/spec.md";
const SPEC_CALL_SESSION: AssistantSession = {
	turns: [
		{
			role: "agent",
			text: "",
			calls: [
				{
					ref: "c1",
					name: "Bash",
					input: { command: "node .widgetarium/bin/widgets.mjs spec Farm" },
					output: "",
					answered: true,
					failed: false,
					at: 0,
				},
			],
		},
	],
	busy: false,
	failure: null,
	tool: null,
	phase: null,
	spent: 0,
	startedAt: 0,
};
export async function checkCardDoors(check: Check, fake: CardDoorsFake): Promise<void> {
	checkCards(check, fake.port);
	await checkFileDoors(check, fake);
	await checkJobDoors(check, fake);
	await checkCardCommands(check, fake);
}

export function fakeSpecs(asked: string[]): SpecPort {
	return {
		read: async (path) => (path === SPEC_FILE ? "spec text" : null),
		watch: (path) => {
			asked.push(`watch ${path}`);
			return () => void asked.push(`unwatch ${path}`);
		},
		change: async (path, edit) => void asked.push(`change ${path} ${edit("was")}`),
	};
}

export function fakeJobs(asked: string[]): FakeJobs {
	let version = 0;
	const watchers = new Set<() => void>();
	const held: Job[] = [
		JobSchema.parse({ id: "home-design", app: "Farm", title: "Design Home", says: "x", phase: "design" }),
	];
	return {
		watch: (changed) => {
			watchers.add(changed);
			return () => void watchers.delete(changed);
		},
		version: () => version,
		apps: () => ["Farm"],
		jobsOf: () => [...held],
		start: async (app, id) => void asked.push(`start ${app} ${id}`),
		stop: async (app, id) => void asked.push(`stop ${app} ${id}`),
		bump: () => {
			version += 1;
			for (const changed of watchers) changed();
		},
	};
}

function checkCards(check: Check, port: ObsidianAssistantPort): void {
	const cards = port.cardsOf(SPEC_CALL_SESSION);
	check(
		"the port reads the cards off the session: a spec shown in a turn is that turn's spec card",
		[cards.ofTurns.map((turn) => turn.specApp), cards.pinned],
		[["Farm"], null],
	);
	check("the same session answers the same cards, read once", port.cardsOf(SPEC_CALL_SESSION) === cards, true);
}

async function checkFileDoors(check: Check, { port, asked }: CardDoorsFake): Promise<void> {
	const read = [await port.readAppFile(SPEC_FILE), await port.readAppFile("nowhere.md")];
	port.onAppFile(SPEC_FILE, () => undefined)();
	await port.changeAppFile(SPEC_FILE, (text) => `${text}!`);
	check(
		"an app file is read, watched and changed through the vault's spec door",
		[read, asked.splice(0)],
		[
			["spec text", null],
			[`watch ${SPEC_FILE}`, `unwatch ${SPEC_FILE}`, `change ${SPEC_FILE} was!`],
		],
	);
}

async function checkJobDoors(check: Check, { port, jobs, asked }: CardDoorsFake): Promise<void> {
	const before = port.jobs();
	const isSameUnchanged = port.jobs() === before;
	let heard = 0;
	const stop = port.onJobs(() => (heard += 1));
	jobs.bump();
	stop();
	const after = port.jobs();
	await port.startJob("Farm", "home-design");
	await port.stopJob("Farm", "home-design");
	check(
		"the jobs read is one snapshot until the jobs change, then a new one, and start and stop reach the jobs",
		[
			before.map((one) => [one.app, one.jobs.map((job) => job.id)]),
			isSameUnchanged,
			heard,
			after === before,
			asked.splice(0),
		],
		[[["Farm", ["home-design"]]], true, 1, false, ["start Farm home-design", "stop Farm home-design"]],
	);
}

async function checkCardCommands(check: Check, { port, asked }: CardDoorsFake): Promise<void> {
	await port.buildIt("Farm");
	await port.approveDesign("Farm");
	await port.openDesign("Farm");
	check(
		"Build it and Approve design are said in the chat naming the card's app, the design opens, and the progress widget is the assistant's",
		[asked.splice(0), port.progressWidget() === PROGRESS],
		[["send Build it: Farm", "send Approve design: Farm", "design Farm"], true],
	);
}
