import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { IconButton } from "./icon-button";
import type { DialogPanelProps } from "./dialog-panel";
import { ModalIdsContext } from "./modal-ids-context";

const CLOSE_LABEL = "Close";

export function DialogHead({ title, onClose }: Pick<DialogPanelProps, "title" | "onClose">): ReactElement | null {
	const { titleId } = useContext(ModalIdsContext);
	if (!title && !onClose) return null;
	return (
		<header className="wg-kit-dialog-head">
			<span id={titleId} className="wg-kit-dialog-title">
				{title}
			</span>
			{onClose ? (
				<IconButton variant="ghost" size="s" label={CLOSE_LABEL} onClick={onClose}>
					<Icon name="x" />
				</IconButton>
			) : null}
		</header>
	);
}
