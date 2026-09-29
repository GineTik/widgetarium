import { useContext } from "react";
import { Renderer } from "./renderer";
import { useDrawsMarkdownInto } from "./use-draws-markdown-into";

export function Attachment({ markdown, letters }: { markdown: string; letters: string }) {
	const render = useContext(Renderer);
	const holder = useDrawsMarkdownInto(render, markdown);
	return (
		<span className="wr-picture" ref={holder}>
			{render ? null : letters}
		</span>
	);
}
