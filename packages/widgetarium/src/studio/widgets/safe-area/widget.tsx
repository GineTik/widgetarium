import { createElement as h } from "react";
import { z } from "zod";
import { defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { STUDIO_BAND_PX } from "../../shared/studio-band-size.js";

const SafeArea = createWidget({
	inject: { getSide: IQuery.output(z.enum(["left", "right"]).default("left")) },
	draw: ({ getSide: side }) => <span className={`wg-studio-safe-area is-${side}`} aria-hidden="true" />,
});

export const metadata = defineMetadata(SafeArea, {
	title: "Safe area",
	description: "The corner the host keeps for its own window buttons, so nothing of the studio stands under them.",
	keywords: ["safe area", "window", "titlebar", "studio"],
	props: { getSide: { label: "Side", hint: "Which top corner of the window." } },
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 4, preferredHeight: STUDIO_BAND_PX } });

export default SafeArea;
