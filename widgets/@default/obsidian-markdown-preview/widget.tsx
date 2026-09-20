import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import { Button, Icon, IconButton } from "widgetarium/kit";
import type { GetAction, ValueGateway, ViewHost } from "widgetarium";

type MarkdownSource = string | { content?: string | null; body?: string | null; path?: string | null } | null;

function markdownOf(source: MarkdownSource) {
	if (typeof source === "string") return source;
	return String(source?.content ?? source?.body ?? "");
}

function pathOf(source: MarkdownSource) {
	if (typeof source !== "object") return null;
	return source?.path ?? null;
}

function usePixels(gateway: ValueGateway<number, { get: GetAction }>, fallback: number) {
	const held = Number(useData(gateway.get).data);
	if (!Number.isFinite(held) || held < 0) return fallback;
	return held;
}

function RenderedMarkdown({ host, markdown, path }: { host: ViewHost; markdown: string; path: string | null }) {
	const body = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!body.current || !host.can.renderMarkdown) return undefined;
		return host.ui.renderMarkdown(body.current, markdown, path ?? undefined);
	}, [host, markdown, path]);

	if (!host.can.renderMarkdown) return <pre className="wg-markdown-preview-plain">{markdown}</pre>;
	return <div ref={body} className="wg-markdown-preview-body markdown-rendered" data-part="body" />;
}

function Collapsed({ collapsedPx, stepPx, children }: { collapsedPx: number; stepPx: number; children: ReactNode }) {
	const content = useRef<HTMLDivElement>(null);
	const [fullPx, setFullPx] = useState(0);
	const [shownPx, setShownPx] = useState(collapsedPx);

	useLayoutEffect(() => setShownPx(collapsedPx), [collapsedPx]);

	useLayoutEffect(() => {
		const measured = content.current;
		if (!measured) return undefined;
		const observer = new ResizeObserver(() => setFullPx(measured.offsetHeight));
		observer.observe(measured);
		setFullPx(measured.offsetHeight);
		return () => observer.disconnect();
	}, []);

	const isLong = fullPx > collapsedPx;
	const isCut = isLong && fullPx > shownPx;
	const more = () => setShownPx(stepPx > 0 ? shownPx + stepPx : fullPx);
	const less = () => setShownPx(collapsedPx);

	return (
		<div className="wg-markdown-preview-collapsible">
			<div
				className="wg-markdown-preview-clip"
				data-cut={isCut}
				style={{ maxHeight: isLong ? Math.min(shownPx, fullPx) : undefined }}
			>
				<div ref={content}>{children}</div>
			</div>
			{isLong ? (
				<Button
					variant="ghost"
					size="s"
					className="wg-markdown-preview-more"
					data-part="more"
					onClick={isCut ? more : less}
				>
					{isCut ? "Show more" : "Show less"}
				</Button>
			) : null}
		</div>
	);
}

export const manifest = defineManifest({
	title: "Obsidian markdown preview",
	description:
		"Text drawn the way Obsidian draws a note: a page or section title, an explanation the screen does not give on its own, a list, a whole note. It shows text and never edits it.",
	keywords: [
		"caption",
		"collapse",
		"description",
		"document",
		"embed",
		"explanation",
		"file",
		"header",
		"heading",
		"label",
		"markdown",
		"note",
		"page",
		"paragraph",
		"preview",
		"read",
		"render",
		"section",
		"show more",
		"subtitle",
		"text",
		"title",
	],
	role: "text",
	preview: {
		size: { w: 6, h: 4 },
		props: {
			source: {
				value:
					"# Weekly review\n\nWhat moved, what stalled, and **one thing** for next week.\n\n- [x] Inbox to zero\n- [ ] Plan Monday\n- [ ] Call the printer\n\n## Notes\n\nThe launch slipped a week, and nobody minded.\n\nNext week is for the pricing page.",
			},
			collapsible: { value: true },
			collapsedHeight: { value: 180 },
		},
	},
	props: {
		source: defineProp<MarkdownSource>()({
			label: "Source",
			hint: "The markdown to draw, typed here or bound to a note. # titles the page, ## a region, ### a group; plain lines are paragraphs. Links and embeds work as in a note.",
			default: "",
		}),
		collapsible: defineProp<boolean>()({
			label: "Collapse long text",
			hint: "Off, all of it is drawn. On, long text is cut to the collapsed height with Show more under it.",
			default: false,
		}),
		collapsedHeight: defineProp<number>()({
			label: "Collapsed height, in pixels",
			hint: "How much of long text shows before Show more is pressed.",
			default: 240,
		}),
		step: defineProp<number>()({
			label: "Show more step, in pixels",
			hint: "How much each press of Show more opens. 0 opens all of it at once.",
			default: 0,
		}),
	},
});

export default createWidget(manifest, ({ source, collapsible, collapsedHeight, step, host, navigator }) => {
	const { data, failure } = useData(source.get);
	const isCollapsible = useData(collapsible.get).data === true;
	const collapsedPx = usePixels(collapsedHeight, 240);
	const stepPx = usePixels(step, 0);
	const path = pathOf(data);
	const canOpen = Boolean(path) && navigator.canNavigate;

	if (failure) return <p className="wg-markdown-preview-failure">{failure}</p>;

	const note = (
		<>
			{canOpen ? (
				<IconButton
					size="xs"
					className="wg-markdown-preview-open"
					data-part="open"
					label="Open in a new tab"
					onClick={() => navigator.navigate(`/${path}`, { target: "blank" })}
				>
					<Icon name="open-tab" />
				</IconButton>
			) : null}
			<RenderedMarkdown host={host} markdown={markdownOf(data)} path={path} />
		</>
	);

	if (isCollapsible) {
		return (
			<Collapsed collapsedPx={collapsedPx} stepPx={stepPx}>
				{note}
			</Collapsed>
		);
	}
	return <div className="wg-markdown-preview">{note}</div>;
});
