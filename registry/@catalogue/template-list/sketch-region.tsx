import type { SketchRegion as Region } from "./types";

const REGION_CLASS: Readonly<Record<string, string>> = {
	main: "wg-catalogue-tpl-region is-main",
	left: "wg-catalogue-tpl-region is-left",
	right: "wg-catalogue-tpl-region is-right",
};

export function SketchRegion({ region }: { readonly region: Region }) {
	return (
		<div className={REGION_CLASS[region.name] ?? "wg-catalogue-tpl-region"}>
			{region.rows.map((row, at) => (
				<div key={at} className="wg-catalogue-tpl-row">
					{row.map((cell, index) => (
						<span key={index} className="wg-catalogue-tpl-cell" style={{ flexGrow: cell.grow }}>
							{cell.label}
						</span>
					))}
				</div>
			))}
		</div>
	);
}
