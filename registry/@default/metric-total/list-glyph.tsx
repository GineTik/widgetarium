import { Stroked } from "./stroked";

const LIST_LINES = "M7.4 6.2h8M7.4 10h8M7.4 13.8h8";

export function ListGlyph({ part, className }: { part?: string; className: string }) {
	return (
		<Stroked part={part} className={className} size={17} weight={1.8}>
			<path d={LIST_LINES} />
			<circle cx="4.4" cy="6.2" r="0.9" fill="currentColor" stroke="none" />
			<circle cx="4.4" cy="10" r="0.9" fill="currentColor" stroke="none" />
			<circle cx="4.4" cy="13.8" r="0.9" fill="currentColor" stroke="none" />
		</Stroked>
	);
}
