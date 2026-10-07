import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import {
	ATTACHMENT_BUSY_STATES,
	ATTACHMENT_ORIENTATION_WORD,
	ATTACHMENT_SIZE_WORD,
	ATTACHMENT_STATE_WORD,
} from "../constants/chat";
import type { AttachmentOrientation, AttachmentSize, AttachmentState } from "../constants/chat";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";
import type { StyleProp } from "../utils/token-style";
import { AttachmentBusyContext } from "./attachment-context";
import { Card } from "./card";

export { AttachmentAction } from "./attachment-action";
export { AttachmentMedia } from "./attachment-media";
export { AttachmentTrigger } from "./attachment-trigger";
export {
	AttachmentActions,
	AttachmentContent,
	AttachmentDescription,
	AttachmentGroup,
	AttachmentTitle,
} from "./attachment-slots";
export type { AttachmentMediaProps } from "./attachment-media";
export type { AttachmentTriggerProps } from "./attachment-trigger";

export interface AttachmentProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
	readonly state?: AttachmentState | undefined;
	readonly size?: AttachmentSize | undefined;
	readonly orientation?: AttachmentOrientation | undefined;
	readonly style?: StyleProp | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function Attachment({ state, size, orientation, className, children, ...rest }: AttachmentProps): ReactElement {
	const worn = wornWord(state, ATTACHMENT_STATE_WORD);
	const isBusy = ATTACHMENT_BUSY_STATES.includes(worn);
	return (
		<AttachmentBusyContext.Provider value={isBusy}>
			<Card
				tone={worn === "error" ? "error" : undefined}
				data-slot="attachment"
				data-state={worn}
				data-size={wornWord(size, ATTACHMENT_SIZE_WORD)}
				data-orientation={wornWord(orientation, ATTACHMENT_ORIENTATION_WORD)}
				aria-busy={isBusy || undefined}
				{...rest}
				className={cn("wg-kit-attachment", className)}
			>
				{children}
			</Card>
		</AttachmentBusyContext.Provider>
	);
}
