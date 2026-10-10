import { NOT_AVAILABLE_ON_HOST } from "../packages/core/src/engine/studio-host.ts";
import { studioSplitOf } from "./studio-sheet.mts";

type Width = { readonly w: number };

type Check = (what: string, isOk: boolean, got: unknown) => void;

interface ImportsOf {
	readonly imports: readonly { readonly path: string }[];
}

export interface CatalogueSeen {
	readonly catalogueElements?: number;
	readonly widgetsPressed?: string | null;
	readonly widgetsLeftOfAi?: boolean;
	readonly outletBefore?: Width | null;
	readonly outletCatalogue?: Width | null;
	readonly sidebarCatalogue?: Width | null;
	readonly listed?: readonly string[];
	readonly installSaid?: string | null;
	readonly pressSaid?: string | null;
	readonly panelsAfterAi?: readonly string[];
	readonly widgetsPressedAfterAi?: string | null;
	readonly askOpened?: boolean;
	readonly picked?: string | null;
	readonly catalogueClosed?: boolean;
}

const CATALOGUE_PACK = "@widgetarium/pack-catalogue";
const CATALOGUE_CLASS = ".wg-studio-catalogue-";
const PICK_SAID = "Nothing is waiting for a widget";
const PROJECT_WIDGET = { id: "task-list", title: "Task list" };

export function catalogueImportsIn(inputs: Readonly<Record<string, ImportsOf>>): string[] {
	return Object.values(inputs).flatMap((input) =>
		input.imports.filter((one) => one.path.startsWith(CATALOGUE_PACK)).map((one) => one.path),
	);
}

export function checkCatalogueAbsentInApp(seen: CatalogueSeen, check: Check): void {
	check("and no catalogue element or Widgets button", seen.catalogueElements === 0, seen.catalogueElements);
}

export function checkCataloguePanel(seen: CatalogueSeen, check: Check): void {
	check("Widgets presses the catalogue panel open", seen.widgetsPressed === "true", seen.widgetsPressed);
	check("and stands left of the AI button", seen.widgetsLeftOfAi === true, seen.widgetsLeftOfAi);
	check("the catalogue panel narrows the outlet by its own width", isNarrowedByPanel(seen), {
		before: seen.outletBefore,
		outlet: seen.outletCatalogue,
		panel: seen.sidebarCatalogue,
	});
	check("it lists the project's own widgets", sameList(seen.listed, [PROJECT_WIDGET.title]), seen.listed);
	check("an install on this host answers not available", seen.installSaid === NOT_AVAILABLE_ON_HOST, seen.installSaid);
	check(
		"a card pressed with nothing asked says so on its line",
		(seen.pressSaid ?? "").startsWith(PICK_SAID),
		seen.pressSaid,
	);
	check(
		"AI swaps the catalogue for the assistant: one panel at a time",
		sameList(seen.panelsAfterAi, ["assistant"]) && seen.widgetsPressedAfterAi === "false",
		{ panels: seen.panelsAfterAi, widgets: seen.widgetsPressedAfterAi },
	);
	check("a widget asked for opens the catalogue panel", seen.askOpened === true, seen.askOpened);
	check("and the card pressed answers the ask", seen.picked === PROJECT_WIDGET.id, seen.picked);
	check("a second Widgets press closes the panel", seen.catalogueClosed === true, seen.catalogueClosed);
}

export function checkCatalogueSheetSplit(sheets: string, check: Check): void {
	const { app, studio } = studioSplitOf(sheets);
	check(
		"the app sheet carries no catalogue rule, the studio sheet does",
		!app.includes(CATALOGUE_CLASS) && studio.includes(CATALOGUE_CLASS),
		{ app: app.split(CATALOGUE_CLASS).length - 1, studio: studio.split(CATALOGUE_CLASS).length - 1 },
	);
}

function isNarrowedByPanel({ outletBefore, outletCatalogue, sidebarCatalogue }: CatalogueSeen): boolean {
	if (!outletBefore || !outletCatalogue || !sidebarCatalogue) return false;
	return outletCatalogue.w < outletBefore.w && Math.abs(outletCatalogue.w + sidebarCatalogue.w - outletBefore.w) <= 1;
}

function sameList(got: readonly string[] | undefined, wanted: readonly string[]): boolean {
	return JSON.stringify(got ?? []) === JSON.stringify(wanted);
}
