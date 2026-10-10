import { createElement as h } from "react";
import type { SketchRegion as Region } from "./types.js";

const REGION_CLASS: Readonly<Record<string, string>> = {
	main: "wg-studio-catalogue-tpl-region is-main",
	left: "wg-studio-catalogue-tpl-region is-left",
	right: "wg-studio-catalogue-tpl-region is-right",
};

export function SketchRegion({ region }: { readonly region: Region }) {
	return (
		<div className={REGION_CLASS[region.name] ?? "wg-studio-catalogue-tpl-region"}>
			{region.rows.map((row, at) => (
				<div key={at} className="wg-studio-catalogue-tpl-row">
					{row.map((cell, index) => (
						<span key={index} className="wg-studio-catalogue-tpl-cell" style={{ flexGrow: cell.grow }}>
							{cell.label}
						</span>
					))}
				</div>
			))}
		</div>
	);
}
