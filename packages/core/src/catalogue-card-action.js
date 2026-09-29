import { createElement as h } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { Ring } from "./catalogue-ring.js";

const ACTION_GLYPH = { add: "plus", install: "download", update: "update", failed: "retry" };

export function CardAction({ state, step, label, onPress }) {
	const press = (event) => {
		event.stopPropagation();
		onPress();
	};
	if (state === "busy") {
		return h(IconButton, { className: "wg-cat-go is-busy", variant: "ghost", size: "s", label, disabled: true }, [
			h(Ring, { key: "ring", step }),
			h("span", { className: "wg-cat-stop", key: "stop" }),
		]);
	}
	return h(
		IconButton,
		{
			className: `wg-cat-go is-${state}`,
			variant: state === "add" ? "accent" : "ghost",
			size: "s",
			label,
			onClick: press,
		},
		h(Icon, { name: ACTION_GLYPH[state], size: 15 }),
	);
}
