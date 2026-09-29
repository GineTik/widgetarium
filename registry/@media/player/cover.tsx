import { useState } from "react";
import { Icon } from "widgetarium/kit";

const REMOTE_PICTURE = /^https?:\/\//i;

export function Cover({ picture }: { picture: string | null }) {
	const [isBroken, setBroken] = useState(false);
	const isDrawable = picture !== null && REMOTE_PICTURE.test(picture) && !isBroken;
	return (
		<div className="wgm-cover">
			{isDrawable ? (
				<img src={picture} alt="" draggable={false} onError={() => setBroken(true)} />
			) : (
				<Icon name="music-4" size={26} />
			)}
		</div>
	);
}
