import { useContext } from "react";
import { Renderer } from "./renderer";
import { useMarkdownDrawnInto } from "./use-markdown-drawn-into";

export function Attachment({ markdown, letters }: { markdown: string; letters: string }) {
	const render = useContext(Renderer);
	const holder = useMarkdownDrawnInto(render, markdown);
	return (
		<span className="wr-picture" ref={holder}>
			{render ? null : letters}
		</span>
	);
}
