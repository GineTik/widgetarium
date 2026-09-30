import type { Provider } from "./providers.js";

export interface ArgsGiven {
	readonly prompt: string;
	readonly brief: string;
	readonly vaultPath: string;
	readonly pluginPath: string;
	readonly session?: string | null | undefined;
	readonly skipPermissions?: boolean | undefined;
}

type ProviderArgs = Pick<Provider, "args" | "modelArgs" | "model" | "resumeArgs" | "bypassArgs">;

const VALUE = "{value}";

export function expandArgs(provider: ProviderArgs, given: ArgsGiven): string[] {
	const expansions: Readonly<Record<string, string[]>> = {
		"{prompt}": [given.prompt],
		"{brief}": [given.brief],
		"{vault}": [given.vaultPath],
		"{plugin}": [given.pluginPath],
		"{model}": fillTemplate(provider.modelArgs, provider.model),
		"{resume}": fillTemplate(provider.resumeArgs, given.session),
		"{yolo}": given.skipPermissions === false ? [] : tokensOf(provider.bypassArgs),
	};
	return tokensOf(provider.args).flatMap((token) => expansions[token] ?? [token]);
}

export function commandLineOf(provider: ProviderArgs & Pick<Provider, "command">, given: ArgsGiven): string {
	return [provider.command, ...expandArgs(provider, given)].join(" ");
}

function tokensOf(template: string | null | undefined): string[] {
	return String(template ?? "")
		.split(/\s+/)
		.filter((token) => token !== "");
}

function fillTemplate(template: string, value: string | null | undefined): string[] {
	if (value === "" || value === null || value === undefined) return [];
	const tokens = tokensOf(template);
	if (tokens.length === 0) return [];
	return tokens.map((token) => (token === VALUE ? String(value) : token));
}
