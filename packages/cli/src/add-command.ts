import fs from "node:fs";
import path from "node:path";
import { discoverProject } from "@widgetarium/core/project/index.js";
import { planAdd, type AddPlan, type PlannedFile } from "./add-plan.js";
import { registryPlacesFor } from "./catalogue-places.js";
import { entryById, nameOfId, readCatalogue } from "./catalogue-read.js";
import type { AddArgs } from "./cli-args.js";
import { CliRefusal, type CliOutput } from "./cli-output.js";
import { addMissingDependencies, type DependencyOutcome } from "./project-manifests.js";
import { requiredProjectAbove, type FoundProject } from "./project-root.js";
import { writeFile } from "./template-files.js";
import { ORIGIN_FILE, originOf } from "./widget-origin.js";

type LibOutcome = "copied" | "unchanged" | "kept";

const NEXT_STEPS = [
	"next:",
	"  move its schema into src/shared/schemas or map it in a feature handler",
	"  run npm run typecheck && npm run check",
];

const SAID_OF_LIB: Readonly<Record<LibOutcome, string>> = {
	copied: "copied",
	unchanged: "unchanged, skipped",
	kept: "kept yours; it differs from the catalogue's, so the widget may need what changed",
};

export async function runAdd(args: AddArgs, output: CliOutput, cwd: string): Promise<number> {
	const project = await requiredProjectAbove(cwd);
	const catalogue = await readCatalogue(registryPlacesFor({ asked: args.registry, cwd, project }));
	const name = args.as ?? nameOfId(args.id);
	await refuseTakenName(project, name);
	const plan = await planAdd(entryById(catalogue, args.id), project.config, name);
	const libs = plan.libFiles.map((file) => ({ file, outcome: writtenLib(project.root, file) }));
	writeWidget(project.root, plan);
	output.out(reportOf(plan, libs, addMissingDependencies(project.root, plan.dependencies)));
	return 0;
}

interface LibWritten {
	readonly file: PlannedFile;
	readonly outcome: LibOutcome;
}

function reportOf(plan: AddPlan, libs: readonly LibWritten[], dependencies: readonly DependencyOutcome[]): string {
	return [
		`added ${plan.entry.id} as ${plan.name} in ${plan.widgetFolder}`,
		...libs.map(({ file, outcome }) => `  lib ${file.at}: ${SAID_OF_LIB[outcome]}`),
		...dependencies.map(dependencyLineOf),
		`  origin ${plan.widgetFolder}/${ORIGIN_FILE}`,
		...plan.entry.card.widgetDependencies.map((id) => `  it draws ${id}; add it too: widgetarium add ${id}`),
		...NEXT_STEPS,
	].join("\n");
}

async function refuseTakenName({ root, files, config }: FoundProject, name: string): Promise<void> {
	const { widgets } = await discoverProject(files, config);
	const taken = widgets.find((widget) => widget.name === name)?.path;
	const folder = `${config.paths.widgets}/${name}`;
	const held = taken ?? (fs.existsSync(path.join(root, folder)) ? folder : undefined);
	if (held === undefined) return;
	throw new CliRefusal(
		`the project already has a widget named ${name} at ${held}; catalogue widgets are never installed over a copy, pass --as <another-name>`,
	);
}

function writtenLib(root: string, file: PlannedFile): LibOutcome {
	const at = path.join(root, file.at);
	if (!fs.existsSync(at)) {
		writeFile(at, file.text);
		return "copied";
	}
	return fs.readFileSync(at, "utf8") === file.text ? "unchanged" : "kept";
}

function writeWidget(root: string, plan: AddPlan): void {
	const origin = originOf(plan.entry, new Date());
	try {
		for (const file of plan.widgetFiles) writeFile(path.join(root, file.at), file.text);
		writeFile(path.join(root, plan.widgetFolder, ORIGIN_FILE), `${JSON.stringify(origin, null, "\t")}\n`);
	} catch (error) {
		fs.rmSync(path.join(root, plan.widgetFolder), { recursive: true, force: true });
		throw error;
	}
}

function dependencyLineOf({ name, range, held }: DependencyOutcome): string {
	if (held === null) return `  dependency ${name}@${range}: added to package.json; run npm install`;
	return `  dependency ${name}@${range}: package.json already holds ${held}, kept`;
}
