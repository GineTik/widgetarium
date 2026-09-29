import { cn, toneClass } from "widgetarium/kit";

export function TagStripes({ tags, tones }: { tags: string[]; tones: Record<string, string> }) {
	if (tags.length === 0) return null;
	return (
		<div className="orbi-task-card-stripes">
			{tags.map((tag, at) => (
				<span key={`${tag}-${at}`} className={cn("orbi-task-card-stripe", toneClass(tones[tag]))} title={tag} />
			))}
		</div>
	);
}
