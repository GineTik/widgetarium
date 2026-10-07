import { createElement as h } from "react";
import type { ReactElement } from "react";
import { DialogClose } from "./dialog-close";
import type { DialogCloseProps } from "./dialog-close";

export function AlertDialogCancel(props: DialogCloseProps): ReactElement {
	return <DialogClose variant="outline" data-wg-autofocus="" {...props} data-slot="alert-dialog-cancel" />;
}
