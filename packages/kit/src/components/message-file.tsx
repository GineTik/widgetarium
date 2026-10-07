import { createElement as h } from "react";
import type { ReactElement } from "react";
import { UNNAMED_FILE } from "../constants/chat";
import { Icon } from "../icons/icon";
import type { FilePartRead } from "../utils/chat-parts";
import { Attachment } from "./attachment";
import { AttachmentMedia } from "./attachment-media";
import { AttachmentContent, AttachmentDescription, AttachmentTitle } from "./attachment-slots";
import { AttachmentTrigger } from "./attachment-trigger";

export interface MessageFileProps {
	readonly file: FilePartRead;
}

export function MessageFile({ file }: MessageFileProps): ReactElement {
	const title = file.title ?? UNNAMED_FILE;
	const imageUrl = file.mediaType.startsWith("image") ? file.url : null;
	return (
		<Attachment size={file.isSource ? "xs" : "sm"} data-source={file.isSource ? "" : undefined}>
			<AttachmentMedia variant={imageUrl ? "image" : "icon"}>
				{imageUrl ? <img src={imageUrl} alt="" /> : <Icon name={iconOf(file)} />}
			</AttachmentMedia>
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

function iconOf(file: FilePartRead): string {
	if (file.isSource) return "link";
	if (file.mediaType.startsWith("audio")) return "file-music";
	if (file.mediaType.startsWith("video")) return "file-play";
	return "file-text";
}
