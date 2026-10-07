import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { useDialog } from "./dialog-context";
import { IconButton } from "./icon-button";

const CLOSE_LABEL = "Close";

export function ModalCloseButton(): ReactElement {
	const { setOpen } = useDialog();
	return (
		<IconButton
			variant="ghost"
			size="s"
			label={CLOSE_LABEL}
			className="wg-kit-modal-close"
			onClick={() => setOpen(false)}
		>
			<Icon name="x" />
		</IconButton>
	);
}
