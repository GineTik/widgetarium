import { createElement as h, Component, useState } from "react";
import { drawWidget } from "./mounted.js";
import { previewProps } from "./preview.js";
import { gapVarsOf } from "./tree.js";
import { shotUrl, themeNow } from "./engine/shot.js";
import { Standin } from "./catalogue-standin.js";

// TRADE-OFF: below this a shape stops reading, so the widget draws a stand-in instead
const READABLE_SCALE = 0.3;

export function Preview({ definition, registry, host, tile, entry }) {
	const manifest = definition.manifest ?? {};
	const [isShotFailed, setShotFailed] = useState(false);
	const shown = isShotFailed ? null : shotUrl(entry, themeNow(), host);

	if (definition.error) {
		return h(Standin, { manifest, tone: "broken", line: "This widget does not load" });
	}
	if (manifest.preview?.instead) {
		return h(Standin, { manifest, line: manifest.preview.instead });
	}
	if (shown) {
		return h("img", {
			className: "wg-cat-shot",
			src: shown,
			alt: manifest.title ?? manifest.id,
			width: Math.round(tile.frameWidth),
			height: Math.round(tile.frameHeight),
			loading: "lazy",
			decoding: "async",
			onError: () => setShotFailed(true),
		});
	}
	if (!definition.component) {
		return h(Standin, { manifest, line: "Not installed yet" });
	}
	if (tile.scale < READABLE_SCALE) {
		return h(Standin, { manifest, line: "Too small to draw here" });
	}

	return h(
		Contained,
		{ instead: () => h(Standin, { manifest, tone: "broken", line: "This widget failed while drawing" }) },
		h(
			"div",
			{
				className: "wg-cat-scaled",
				style: {
					width: `${tile.size.width}px`,
					height: `${tile.size.height}px`,
					transform: `scale(${tile.scale})`,
					...gapVarsOf(1),
				},
			},
			drawWidget(definition, previewProps(definition, { registry, host })),
		),
	);
}

class Contained extends Component {
	state = { failure: null };

	componentDidCatch(failure) {
		this.setState({ failure });
	}

	render() {
		return this.state.failure ? this.props.instead(this.state.failure) : this.props.children;
	}
}
