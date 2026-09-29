import { useState } from "react";
import type { ViewHost } from "widgetarium";
import { PlaceholderMark } from "widgetarium/kit";
import { Embedded } from "./embedded";
import type { Album } from "./types";

const WEB_ADDRESS = /^(?:https?:|data:)/i;
const ALREADY_AN_EMBED = /^!\[\[.+\]\]$/;

export function Art({ album, host }: { album: Album; host: ViewHost }) {
	const written = String(album.cover ?? "").trim();
	const [hasFailed, setFailed] = useState(false);

	const isWebImage = Boolean(written) && !hasFailed && WEB_ADDRESS.test(written);
	if (!isWebImage && written && !hasFailed && host?.can?.renderMarkdown)
		return <Embedded markdown={embedOf(written)} host={host} />;
	return (
		<div className="wg-album-art">
			{isWebImage ? (
				<img src={written} alt="" draggable={false} onError={() => setFailed(true)} />
			) : (
				<PlaceholderMark seed={album.title ?? ""} />
			)}
		</div>
	);
}

const embedOf = (written: string) => (ALREADY_AN_EMBED.test(written) ? written : `![[${written}]]`);
