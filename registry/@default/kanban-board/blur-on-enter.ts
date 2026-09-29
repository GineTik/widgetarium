import type { KeyboardEvent } from "react";

export function blurOnEnterRestoreOnEscape(original: string) {
	return (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === "Enter") {
			event.preventDefault();
			event.currentTarget.blur();
		}
		if (event.key === "Escape") {
			event.currentTarget.textContent = original;
			event.currentTarget.blur();
		}
	};
}
