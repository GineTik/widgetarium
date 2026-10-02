import { IContent, IHere, IHost, IQuery, IReader, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Button, Icon, IconButton, Card } from "widgetarium/kit";
import { useEffect, useState } from "react";
import { LanguagePicker } from "./language-picker";
import { Painted } from "./painted";
import { Refusal } from "./refusal";
import { STYLE } from "./style";

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

const BINARY = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
	"bmp",
	"avif",
	"ico",
	"tif",
	"tiff",
	"psd",
	"pdf",
	"zip",
	"gz",
	"tar",
	"7z",
	"rar",
	"bz2",
	"xz",
	"mp4",
	"webm",
	"mov",
	"mkv",
	"avi",
	"mp3",
	"wav",
	"ogg",
	"m4a",
	"flac",
	"ttf",
	"otf",
	"woff",
	"woff2",
	"eot",
	"exe",
	"dll",
	"so",
	"dylib",
	"className",
	"wasm",
]);

const CONTROL_BYTES = /[\x00-\x08\x0e-\x1f]/;

const TICK = String.fromCharCode(96);

// TRADE-OFF: measured from the content, never fixed at three — a shorter fence closes early
export function pickFence(text: unknown): string {
	let longest = 0;
	for (const [run] of String(text ?? "").matchAll(/`+/g)) longest = Math.max(longest, run.length);
	return TICK.repeat(Math.max(3, longest + 1));
}

export function readRequest(content: unknown): { link: string; language: string } {
	const [named = "", ...rest] = String(content ?? "").split("|");
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

const CodeBlock = createWidget({
	inject: {
		getLines: IQuery.expects(z.number().default(30)),
		getMaxKilobytes: IQuery.expects(z.number().default(256)),
		content: IContent,
		reader: IReader,
		host: IHost,
		here: IHere,
	},
	draw: ({ content, reader, host, here, getLines: linesShown, getMaxKilobytes: maxKilobytes }) => {
		const request = readRequest(content);
		const step = Math.max(1, linesShown);
		const maxBytes = Math.max(1, maxKilobytes) * 1024;

		const [file, setFile] = useState<{ text: string; failure: string | null; read: boolean }>({
			text: "",
			failure: null,
			read: false,
		});
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
			<Card type="group" className="wgc-code">
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
			</Card>
		);
	},
});

export const metadata = defineMetadata(CodeBlock, {
	title: "Code block",
	description: "Shows a file from the vault as code inside a note, a page of lines at a time.",
	keywords: [
		"code",
		"file",
		"source",
		"snippet",
		"embed",
		"include",
		"syntax",
		"script",
		"program",
		"listing",
		"monospace",
		"fence",
	],
	preview: {
		size: { w: 6, h: 4 },
		content: "main.py",
		files: {
			"main.py":
				'import sys\n\n\ndef main(argv):\n    if not argv:\n        print("nothing to do")\n        return 0\n    for name in argv:\n        print(f"hello, {name}")\n    return 0\n\n\nif __name__ == "__main__":\n    sys.exit(main(sys.argv[1:]))\n',
		},
		shot: { of: "253967223" },
	},
	props: {
		getLines: { label: "Lines shown at first, and added by each press", aka: ["lines"] },
		getMaxKilobytes: { label: "Largest file that may be shown, in KB", aka: ["maxKilobytes"] },
	},
});

export const layout = defineLayout({
	inline: true,
	size: { preferredWidth: "full", preferredHeight: "auto" },
});

export default CodeBlock;
