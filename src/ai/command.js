const VALUE = "{value}";

function tokensOf(template) {
	return String(template ?? "")
		.split(/\s+/)
		.filter((token) => token !== "");
}

function filledWith(template, value) {
	if (value === "" || value === null || value === undefined) return [];
	const tokens = tokensOf(template);
	if (tokens.length === 0) return [];
	return tokens.map((token) => (token === VALUE ? String(value) : token));
}

export function expandArgs(provider, given) {
	const expansions = {
		"{prompt}": [given.prompt],
		"{brief}": [given.brief],
		"{vault}": [given.vaultPath],
		"{plugin}": [given.pluginPath],
		"{model}": filledWith(provider.modelArgs, provider.model),
		"{resume}": filledWith(provider.resumeArgs, given.session),
		"{yolo}": given.skipPermissions === false ? [] : tokensOf(provider.bypassArgs),
	};
	return tokensOf(provider.args).flatMap((token) => expansions[token] ?? [token]);
}

export function commandLineOf(provider, given) {
	return [provider.command, ...expandArgs(provider, given)].join(" ");
}
