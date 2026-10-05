import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isSafeAppName } from "@widgetarium/core/app-design.js";
import { DESIGN_SYSTEM_PATH, appDesignSystemPathOf, rulesInForce } from "@widgetarium/core/design-rules.js";
import type { DesignRule } from "@widgetarium/core/design-rules.js";
import type { Told } from "./shape-command.js";

const NO_APP = 'Name the app whose design to check, for example: rules "Weekly review"';
const NO_RULES = "There is no design system at {path}: nothing to check against.";
const SAID = `Check the canvas against every rule below: open the picture from \`shot --design {app}\` and answer each id with yes or no and, for a no, what you redraw. Redraw until every answer is yes, and only then run \`design {app}\`.
{from}
{rules}`;
const FROM_APP = "Rules from {path} replace or add to the vault's.";

export async function rulesOfApp(vault: string, app: string | undefined): Promise<Told<DesignRule[]>> {
	if (!app || !isSafeAppName(app)) return { refusal: NO_APP };
	const vaultText = await readFile(join(vault, DESIGN_SYSTEM_PATH), "utf8").catch(() => null);
	const appText = await readFile(join(vault, appDesignSystemPathOf(app)), "utf8").catch(() => null);
	const rules = rulesInForce(vaultText, appText);
	if (rules.length === 0) return { refusal: NO_RULES.replace("{path}", DESIGN_SYSTEM_PATH) };
	const said = SAID.replaceAll("{app}", app)
		.replace("{from}", appText === null ? "" : FROM_APP.replace("{path}", appDesignSystemPathOf(app)))
		.replace("{rules}", rules.map((rule) => `${rule.id} — ${rule.text}`).join("\n"));
	return { value: rules, text: said };
}
