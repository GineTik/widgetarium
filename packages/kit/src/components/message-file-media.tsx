import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import type { FilePartRead } from "../utils/chat-parts";
import { AttachmentMedia } from "./attachment-media";

export interface MessageFileMediaProps {
	readonly file: FilePartRead;
}

export function MessageFileMedia({ file }: MessageFileMediaProps): ReactElement {
	const imageUrl = imageUrlOf(file);
	return (
		<AttachmentMedia variant={imageUrl ? "image" : "icon"}>
			{imageUrl ? <img src={imageUrl} alt="" /> : <Icon name={iconOf(file)} />}
		</AttachmentMedia>
	);
}

function imageUrlOf(file: FilePartRead): string | null {
	if (!file.mediaType.startsWith("image")) return null;
	return file.url;
}

function iconOf(file: FilePartRead): string {
	if (file.isSource) return "link";
	if (file.mediaType.startsWith("audio")) return "file-music";
	if (file.mediaType.startsWith("video")) return "file-play";
	return "file-text";
}
