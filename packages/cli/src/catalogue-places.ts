import path from "node:path";
import { CliRefusal } from "./cli-output.js";
import { packageLocations } from "./package-locations.js";
import type { FoundProject } from "./project-root.js";
import { isWebAddress } from "./registry-reader.js";

const REPO_REGISTRY = "registry";
const NO_REGISTRY =
	'no catalogue to read: pass --registry <folder or URL>, or list them in widgetarium.json as "catalogue": { "registries": [...] }';

export interface PlacesAsk {
	readonly asked: string | undefined;
	readonly cwd: string;
	readonly project: FoundProject | null;
}

export function registryPlacesFor({ asked, cwd, project }: PlacesAsk): string[] {
	if (asked !== undefined) return [placeFrom(cwd, asked)];
	const configured = project?.config.catalogue?.registries ?? [];
	if (project !== null && configured.length > 0) return configured.map((place) => placeFrom(project.root, place));
	const { repo } = packageLocations();
	if (repo !== null) return [path.join(repo, REPO_REGISTRY)];
	throw new CliRefusal(NO_REGISTRY);
}

function placeFrom(base: string, place: string): string {
	return isWebAddress(place) ? place : path.resolve(base, place);
}
