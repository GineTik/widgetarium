import { FLAME } from "@default/lib";

export function Flame({ size }: { size: number }) {
	return (
		<svg className="hs-flame" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			<path fillRule="evenodd" clipRule="evenodd" d={FLAME} />
		</svg>
	);
}
