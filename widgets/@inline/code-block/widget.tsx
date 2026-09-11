import { createWidget, useData } from "widgetarium";
import type { Here, InlineContent, PassageReader, PassageRecord, ValueGateway, ViewHost } from "widgetarium";
import { Button, Icon, IconButton, Popover, PopoverItem, PopoverSearch } from "widgetarium/kit";
import { useEffect, useRef, useState } from "react";

const STYLE = `
.wgc-code {
	position: relative;
	border-radius: var(--wg-kit-plate, 22px);
	background: var(--wg-kit-fill, var(--background-secondary));
	overflow: hidden;
}

/* CONTEXT: 46px = the menu's own 8px inset, its 32px box and the row's gap */
.wgc-bar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 6px;
	padding: 8px 46px 0 14px;
}

/* CONTEXT: the kit's own step is 32, and the icons beside this one are painted at it */
.wgc-lang.wg-kit-btn.is-s {
	height: 32px;
	padding: 0 10px 0 14px;
	font-family: var(--font-monospace);
	font-weight: var(--font-medium, 500);
}

/* CONTEXT: Obsidian's markdown post-processor puts its own copy button in every code block */
.wgc-body .copy-code-button,
.wgc-body pre > button {
	display: none;
}

/* CONTEXT: the kit's chevron points along the row; a menu opens downward */
.wgc-caret {
	margin-left: 2px;
	transform: rotate(90deg);
}

.wgc-plus {
	margin-right: 6px;
}

.wgc-needle {
	margin-left: 6px;
	font-family: var(--font-monospace);
	color: var(--text-muted);
}

.wgc-body {
	padding: 0 14px 4px;
}

/* CONTEXT: the host sits inside .markdown-rendered, whose pre rule pads 12px 16px and floors 38px */
.wgc-body pre {
	margin: 0;
	padding: 0;
	min-height: 0;
	border-radius: var(--wg-kit-item, 14px);
	background: transparent;
}

.wgc-plain {
	margin: 0;
	padding: 0 14px 12px;
	overflow-x: auto;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-small, 13px);
	line-height: 1.5;
	white-space: pre;
	color: var(--text-normal);
}

.wgc-more {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 6px 14px 12px;
}

.wgc-left {
	color: var(--text-muted);
	font-size: var(--font-ui-smaller, 12px);
}

.wgc-code.is-failed {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 12px 16px;
}

.wgc-what {
	font-weight: 600;
	color: var(--text-normal);
}

.wgc-why {
	color: var(--text-muted);
	font-size: var(--font-ui-small, 13px);
	overflow-wrap: anywhere;
}
`;

// CONTEXT: a fence tag is a Prism language id, and only the extension can supply one
const BY_EXTENSION: Record<string, string> = {
	bash: "bash",
	cc: "cpp",
	cjs: "javascript",
	cs: "csharp",
	cxx: "cpp",
	h: "c",
	hpp: "cpp",
	htm: "html",
	jsonc: "json",
	kt: "kotlin",
	m: "objectivec",
	md: "markdown",
	mjs: "javascript",
	pl: "perl",
	ps1: "powershell",
	py: "python",
	rb: "ruby",
	rs: "rust",
	sh: "bash",
	tf: "hcl",
	ts: "typescript",
	txt: "text",
	yml: "yaml",
	zsh: "bash",
};

const LANGUAGES = [
	"bash", "c", "cpp", "csharp", "css", "dart", "diff", "docker", "elixir", "erlang", "go",
	"graphql", "groovy", "haskell", "hcl", "html", "ini", "java", "javascript", "json", "jsx",
	"kotlin", "latex", "lua", "makefile", "markdown", "matlab", "nginx", "objectivec", "perl",
	"php", "powershell", "python", "r", "regex", "ruby", "rust", "scala", "scss", "sql", "swift",
	"text", "toml", "tsx", "typescript", "xml", "yaml", "zig",
];

// CONTEXT: the common accident, caught before a byte is read
const BINARY = new Set([
	"png", "jpg", "jpeg", "gif", "webp", "bmp", "avif", "ico", "tif", "tiff", "psd",
	"pdf", "zip", "gz", "tar", "7z", "rar", "bz2", "xz",
	"mp4", "webm", "mov", "mkv", "avi", "mp3", "wav", "ogg", "m4a", "flac",
	"ttf", "otf", "woff", "woff2", "eot", "exe", "dll", "so", "dylib", "className", "wasm",
]);

// CONTEXT: no text file carries NUL..BS or SO..US — the defence against a binary nobody listed
const CONTROL_BYTES = /[\x00-\x08\x0e-\x1f]/;

const TICK = String.fromCharCode(96);

// TRADE-OFF: measured from the content, never fixed at three — a shorter fence closes early
export function pickFence(text: unknown): string {
	let longest = 0;
	for (const [run] of String(text ?? "").matchAll(/`+/g)) longest = Math.max(longest, run.length);
	return TICK.repeat(Math.max(3, longest + 1));
}

// CONTEXT: Obsidian forbids "|" in a file name, so it is the one safe separator
export function readRequest(content: unknown): { link: string; language: string } {
	const [named, ...rest] = String(content ?? "").split("|");
	return { link: named.trim(), language: rest.join("|").trim() };
}

export function extensionOf(link: unknown): string {
	const text = String(link ?? "");
	const name = text.slice(text.lastIndexOf("/") + 1);
	const dot = name.lastIndexOf(".");
	return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
}

// TRADE-OFF: a hint falling through to the raw extension, never a gate — an unmapped .zig draws
export function languageOf(link: unknown, asked: string): string {
	if (asked) return asked;
	const extension = extensionOf(link);
	return BY_EXTENSION[extension] ?? extension;
}

function LanguagePicker({ language, onPick }: { language: string; onPick: (next: string) => void }) {
	const [isOpen, setOpen] = useState(false);
	const choose = (next: string) => {
		setOpen(false);
		onPick(next);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			placement="below"
			trigger={
				<Button size="s" className="wgc-lang wg-kit-glass">
					{language || "plain"}
					<Icon name="chevron" size={12} className="wgc-caret" />
				</Button>
			}
		>
			<PopoverSearch placeholder="Find a language">
				{(needle: string) => [
					...LANGUAGES.filter((name) => name.includes(needle)).map((name) => (
						<PopoverItem key={name} checked={name === language} onClick={() => choose(name)}>
							{name}
						</PopoverItem>
					)),
					needle !== "" && !LANGUAGES.includes(needle) ? (
						<PopoverItem key="custom" onClick={() => choose(needle)}>
							<Icon name="plus" size={14} className="wgc-plus" />
							Use custom language
							<span className="wgc-needle">{needle}</span>
						</PopoverItem>
					) : null,
				]}
			</PopoverSearch>
		</Popover>
	);
}

function Painted({ host, markdown }: { host: ViewHost; markdown: string }) {
	const node = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!node.current) return undefined;
		return host.ui.renderMarkdown(node.current, markdown);
	}, [markdown]);

	return <div className="wgc-body" ref={node} />;
}

function Refusal({ why }: { why: string }) {
	return (
		<div className="wgc-code is-failed">
			<style>{STYLE}</style>
			<span className="wgc-what">This file cannot be shown as code</span>
			<span className="wgc-why">{why}</span>
		</div>
	);
}

type CodeBlockProps = InlineContent & {
	reader: PassageReader;
	host?: ViewHost;
	here?: Here<PassageRecord> | null;
	lines: ValueGateway<number>;
	maxKilobytes: ValueGateway<number>;
};

function CodeBlock({ content, reader, host, here, lines: linesShown, maxKilobytes }: CodeBlockProps) {
	const request = readRequest(content);
	const step = Math.max(1, Number(useData(linesShown.get).data ?? 30));
	const maxBytes = Math.max(1, Number(useData(maxKilobytes.get).data ?? 256)) * 1024;

	const [file, setFile] = useState<{ text: string; failure: string | null; read: boolean }>({ text: "", failure: null, read: false });
	const [shown, setShown] = useState(step);
	const [asked, setAsked] = useState("");
	const [isCopied, setCopied] = useState(false);

	useEffect(() => {
		let live = true;
		setShown(step);
		setAsked("");
		const extension = extensionOf(request.link);
		if (BINARY.has(extension)) {
			setFile({ text: "", failure: `a .${extension} file is not text`, read: false });
			return undefined;
		}
		reader.read(request.link, { maxBytes }).then((answer) => {
			if (!live) return;
			if (!answer.ok) return setFile({ text: "", failure: answer.failure, read: false });
			if (CONTROL_BYTES.test(answer.text)) {
				return setFile({ text: "", failure: `${answer.path} reads as binary, not as text`, read: false });
			}
			setFile({ text: answer.text, failure: null, read: true });
		});
		return () => {
			live = false;
		};
	}, [request.link, step, maxBytes]);

	if (file.failure) return <Refusal why={file.failure} />;

	const lines = file.read ? file.text.split("\n") : [];
	const body = lines.slice(0, shown).join("\n");
	const left = Math.max(0, lines.length - shown);
	const language = languageOf(request.link, asked || request.language);
	const fence = pickFence(body);

	// CONTEXT: written back into the line, so a pick survives the next render
	const pick = (next: string) => {
		setAsked(next);
		if (here?.canUpdate) here.update(`${request.link} | ${next}`);
	};

	const copy = () => {
		window.navigator?.clipboard?.writeText?.(file.text)?.catch?.(() => {});
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	};

	return (
		<div className="wgc-code">
			<style>{STYLE}</style>
			<div className="wgc-bar wg-inline-shy">
				<LanguagePicker language={language} onPick={pick} />
				<IconButton size="s" variant="glass" label={isCopied ? "Copied" : "Copy"} onClick={copy}>
					<Icon name={isCopied ? "tick" : "copy"} size={15} />
				</IconButton>
			</div>
			{host?.can?.renderMarkdown ? (
				<Painted host={host} markdown={`${fence}${language}\n${body}\n${fence}`} />
			) : (
				<pre className="wgc-plain">
					<code>{body}</code>
				</pre>
			)}
			{left > 0 ? (
				<div className="wgc-more">
					<Button size="s" onClick={() => setShown(shown + step)}>{`Show ${step} more`}</Button>
					<span className="wgc-left">{`${left} lines left`}</span>
				</div>
			) : null}
		</div>
	);
}

export default createWidget(CodeBlock, { id: "@inline/code-block", title: "Code block", inline: true });
