import type { KeyboardEvent, ReactNode } from "react";

const PRESS_KEYS = ["Enter", " "];

export function Pick({
	isPicked,
	onPick,
	children,
}: {
	isPicked: boolean;
	onPick: (() => void) | null;
	children: ReactNode;
}) {
	return (
		<div className="wg-list-pick" {...pressablePropsOf(isPicked, onPick)}>
			{children}
		</div>
	);
}

function pressablePropsOf(isPicked: boolean, onPick: (() => void) | null) {
	if (onPick === null) return {};
	return {
		"data-picked": isPicked ? "" : undefined,
		role: "button",
		tabIndex: 0,
		"aria-pressed": isPicked,
		onClick: onPick,
		onKeyDown: (event: KeyboardEvent) => {
			if (!PRESS_KEYS.includes(event.key)) return;
			event.preventDefault();
			onPick();
		},
	};
}
