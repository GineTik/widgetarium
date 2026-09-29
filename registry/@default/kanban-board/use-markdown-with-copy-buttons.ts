import { iconButtonClass } from "widgetarium/kit";
import { useEffect, useRef } from "react";
import { GLYPHS } from "./glyphs";
import type { RenderMarkdown } from "./types";

const COPIED_SECONDS = 1.4;

export function useMarkdownWithCopyButtons(markdown: string, render: RenderMarkdown | undefined) {
	const holder = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const element = holder.current;
		if (!element || !render) return undefined;
		const stop = render(element, markdown);
		const dressed = new Map<Element, () => void>();

		const dress = () => {
			for (const block of element.querySelectorAll("pre")) {
				if (!dressed.has(block)) dressed.set(block, addCopyButton(block));
			}
			for (const [block, undo] of dressed) {
				if (element.contains(block)) continue;
				undo();
				dressed.delete(block);
			}
		};

		dress();
		const watcher = new MutationObserver(dress);
		watcher.observe(element, { childList: true, subtree: true });

		return () => {
			watcher.disconnect();
			for (const undo of dressed.values()) undo();
			stop?.();
		};
	}, [markdown]);

	return holder;
}

function glyphMarkup(name: string): string {
	return `<svg class="otd-glyph" viewBox="0 0 16 16" aria-hidden="true">${GLYPHS[name]}</svg>`;
}

// TRADE-OFF: the kit's class function, not its component — preact does not own this markup
function addCopyButton(block: HTMLElement) {
	const button = block.ownerDocument.createElement("button");
	button.type = "button";
	button.className = `${iconButtonClass({ size: "s" })} otd-copy`;
	button.setAttribute("aria-label", "Copy");
	button.title = "Copy";
	button.innerHTML = glyphMarkup("copy");

	let settle: ReturnType<typeof setTimeout> | undefined;
	const copy = () => {
		const text = (block.querySelector("code") ?? block).textContent ?? "";
		block.ownerDocument.defaultView?.navigator?.clipboard?.writeText?.(text);
		button.innerHTML = glyphMarkup("tick");
		clearTimeout(settle);
		settle = setTimeout(() => {
			button.innerHTML = glyphMarkup("copy");
		}, COPIED_SECONDS * 1000);
	};

	button.addEventListener("click", copy);
	block.appendChild(button);
	return () => {
		clearTimeout(settle);
		button.removeEventListener("click", copy);
		button.remove();
	};
}
