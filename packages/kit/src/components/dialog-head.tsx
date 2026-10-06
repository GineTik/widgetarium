import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { IconButton } from "./icon-button";
import type { DialogProps } from "./dialog";

const CLOSE_LABEL = "Close";

export function DialogHead({ title, onClose }: Pick<DialogProps, "title" | "onClose">): ReactElement | null {
	if (!title && !onClose) return null;
	return (
		<header className="wg-kit-dialog-head">
			<span className="wg-kit-dialog-title">{title}</span>
			{onClose ? (
				<IconButton variant="ghost" size="s" label={CLOSE_LABEL} onClick={onClose}>
					<Icon name="x" />
				</IconButton>
			) : null}
		</header>
	);
}
