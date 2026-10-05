import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";

export interface PhotoCardOpenProps {
	readonly title: string;
	readonly onOpen?: (() => void) | undefined;
}

export function PhotoCardOpen({ title, onOpen }: PhotoCardOpenProps): ReactElement | null {
	if (!onOpen) return null;
	return (
		<button type="button" className="wg-kit-photo-card-open" aria-label={title} onClick={onOpen}>
			<Icon name="arrow-up-right" />
		</button>
	);
}
