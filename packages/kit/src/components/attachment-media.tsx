import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { ATTACHMENT_MEDIA_WORD } from "../constants/chat";
import type { AttachmentMediaVariant } from "../constants/chat";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";
import { AttachmentBusyContext } from "./attachment-context";
import { Spinner } from "./spinner";

export interface AttachmentMediaProps extends HTMLAttributes<HTMLDivElement> {
	readonly variant?: AttachmentMediaVariant | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function AttachmentMedia({ variant, className, children, ...rest }: AttachmentMediaProps): ReactElement {
	const isBusy = useContext(AttachmentBusyContext);
	return (
		<div
			data-slot="attachment-media"
			data-variant={wornWord(variant, ATTACHMENT_MEDIA_WORD)}
			{...rest}
			className={cn("wg-kit-attachment-media", className)}
		>
			{children}
			{isBusy ? (
				<span className="wg-kit-attachment-busy">
					<Spinner />
				</span>
			) : null}
		</div>
	);
}
