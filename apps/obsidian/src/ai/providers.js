export const CLI = "cli";
export const HTTP = "http";

// TRADE-OFF: a whitespace-split template, not a shell line; no quoting rules, no shell
export const PLACEHOLDERS = ["{prompt}", "{brief}", "{vault}", "{plugin}", "{model}", "{resume}", "{yolo}"];

export const PRESETS = [
	{
		id: "claude-code",
		label: "Claude Code",
		kind: CLI,
		canEdit: true,
		command: "claude",
		args: "-p --output-format stream-json --verbose --include-partial-messages --add-dir {vault} --add-dir {plugin} --append-system-prompt {brief} {model} {yolo} {resume} {prompt}",
		modelArgs: "--model {value}",
		resumeArgs: "--resume {value}",
		bypassArgs: "--permission-mode bypassPermissions",
		outputFormat: "claude-stream",
		model: "",
		endpoint: "",
	},
	{
		id: "codex",
		label: "Codex",
		kind: CLI,
		canEdit: true,
		command: "codex",
		args: "exec --cd {vault} --skip-git-repo-check {model} {yolo} {resume} {prompt}",
		modelArgs: "--model {value}",
		resumeArgs: "resume {value}",
		bypassArgs: "--dangerously-bypass-approvals-and-sandbox",
		outputFormat: "text",
		model: "",
		endpoint: "",
	},
	{
		id: "opencode",
		label: "OpenCode",
		kind: CLI,
		canEdit: true,
		command: "opencode",
		args: "run --dir {vault} {model} {yolo} {resume} {prompt}",
		modelArgs: "--model {value}",
		resumeArgs: "--continue",
		bypassArgs: "--dangerously-skip-permissions",
		outputFormat: "text",
		model: "",
		endpoint: "",
	},
	{
		id: "gemini",
		label: "Gemini CLI",
		kind: CLI,
		canEdit: true,
		command: "gemini",
		args: "--prompt {prompt} --include-directories {vault} {model} {yolo} {resume}",
		modelArgs: "--model {value}",
		resumeArgs: "--resume latest",
		bypassArgs: "--approval-mode yolo",
		outputFormat: "text",
		model: "",
		endpoint: "",
	},
	{
		id: "ollama",
		label: "Ollama",
		kind: HTTP,
		canEdit: false,
		command: "",
		args: "",
		modelArgs: "",
		resumeArgs: "",
		bypassArgs: "",
		outputFormat: "ollama-stream",
		model: "llama3.2",
		endpoint: "http://localhost:11434/api/chat",
	},
	{
		id: "custom",
		label: "Custom command",
		kind: CLI,
		canEdit: true,
		command: "",
		args: "{brief} {prompt}",
		modelArgs: "",
		resumeArgs: "",
		bypassArgs: "",
		outputFormat: "text",
		model: "",
		endpoint: "",
	},
];

export const DEFAULT_PROVIDER = PRESETS[0].id;

export function presetById(id) {
	return PRESETS.find((preset) => preset.id === id) ?? null;
}

export const EDITABLE_FIELDS = [
	"command",
	"args",
	"modelArgs",
	"resumeArgs",
	"bypassArgs",
	"model",
	"endpoint",
	"outputFormat",
];

export function briefGoesInTheMessage(provider) {
	if (provider?.kind === HTTP) return false;
	return !String(provider?.args ?? "").includes("{brief}");
}

export function resumesWithoutAnId(provider) {
	const resumeArgs = String(provider?.resumeArgs ?? "");
	return resumeArgs !== "" && !resumeArgs.includes("{value}");
}
