import { SPEC_FOLDER } from "./app-spec.js";
import { ROOT } from "./paths.js";

export const DESIGN_SYSTEM_FILE = "design-system.md";
export const DESIGN_SYSTEM_PATH = `${ROOT}/${DESIGN_SYSTEM_FILE}`;

export interface DesignRule {
	readonly id: string;
	readonly text: string;
	readonly from: "vault" | "app";
}

const RULE_START = /^- \*\*([A-Z]+\d+) · (.+)$/;
const CONTINUED = /^ {2}\S/;

export function appDesignSystemPathOf(app: string): string {
	return `${SPEC_FOLDER}/${app}/${DESIGN_SYSTEM_FILE}`;
}

export function rulesIn(text: string, from: DesignRule["from"]): DesignRule[] {
	const rules: DesignRule[] = [];
	for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
		const started = RULE_START.exec(line);
		if (started) {
			rules.push({ id: started[1] ?? "", text: plainOf(started[2] ?? ""), from });
			continue;
		}
		const last = rules[rules.length - 1];
		if (last && CONTINUED.test(line))
			rules[rules.length - 1] = { ...last, text: `${last.text} ${plainOf(line.trim())}` };
	}
	return rules;
}

export function rulesInForce(vaultText: string | null, appText: string | null): DesignRule[] {
	const appRules = appText === null ? [] : rulesIn(appText, "app");
	const replaced = new Set(appRules.map((rule) => rule.id));
	const vaultRules = (vaultText === null ? [] : rulesIn(vaultText, "vault")).filter((rule) => !replaced.has(rule.id));
	return [...vaultRules, ...appRules];
}

function plainOf(text: string): string {
	return text.replace(/\*\*/g, "").trim();
}
