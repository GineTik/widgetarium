import { createElement as h } from "react";

export function Line({ tone, text, className }: { tone: string; text: string; className?: string }) {
	return (
		<div className={className} style={{ color: tone }}>
			{text}
		</div>
	);
}
