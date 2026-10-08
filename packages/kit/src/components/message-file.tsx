import { createElement as h } from "react";
import type { ReactElement } from "react";
import { UNNAMED_FILE } from "../constants/chat";
import type { FilePartRead } from "../utils/chat-parts";
import { dataFlagsOf } from "../utils/data-flags";
import { Attachment } from "./attachment";
import { AttachmentContent, AttachmentDescription, AttachmentTitle } from "./attachment-slots";
import { AttachmentTrigger } from "./attachment-trigger";
import { MessageFileMedia } from "./message-file-media";

export interface MessageFileProps {
	readonly file: FilePartRead;
}

export function MessageFile({ file }: MessageFileProps): ReactElement {
	const title = file.title ?? UNNAMED_FILE;
	return (
		<Attachment size={file.isSource ? "xs" : "sm"} {...dataFlagsOf({ source: file.isSource })}>
			<MessageFileMedia file={file} />
			<AttachmentContent>
				<AttachmentTitle>{title}</AttachmentTitle>
				{file.mediaType ? <AttachmentDescription>{file.mediaType}</AttachmentDescription> : null}
			</AttachmentContent>
			{file.url ? (
				<AttachmentTrigger
					render={<a href={file.url} target="_blank" rel="noreferrer" />}
					aria-label={`Open ${title}`}
				/>
			) : null}
		</Attachment>
	);
}
