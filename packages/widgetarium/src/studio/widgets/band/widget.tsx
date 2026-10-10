import { createElement as h } from "react";
import { ISlot, defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { STUDIO_BAND_PX } from "../../shared/studio-band-size.js";

const Band = createWidget({
	inject: { start: ISlot.array(), end: ISlot.array() },
	draw: ({ start, end }) => (
		<div>
			<div className="wg-studio-band-row">
				<div className="wg-studio-corner is-left">
					{start.map((Item) => (
						<Item key={Item.id} />
					))}
				</div>
				<div className="wg-studio-corner is-right">
					{end.map((Item) => (
						<Item key={Item.id} />
					))}
				</div>
			</div>
		</div>
	),
});

export const metadata = defineMetadata(Band, {
	title: "Studio band",
	description: "The studio's top band: the left corner's controls and the right corner's, on one line.",
	keywords: ["studio", "band", "titlebar", "corner", "chrome"],
	props: {
		start: { label: "Left corner", hint: "From the window edge inward." },
		end: { label: "Right corner", hint: "From inside out to the window edge." },
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: "full", preferredHeight: STUDIO_BAND_PX },
});

export default Band;
