import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Avatar, AvatarFallback } from "../../index";

const AVATAR_SIZES = ["s", "m", "l", "xl"];

export function AvatarsDemo(): ReactElement {
	return (
		<div className="wg-showcase-row wg-showcase-bottom">
			{AVATAR_SIZES.map((size) => (
				<Avatar key={size} size={size} label="Ana Halden">
					<AvatarFallback seed={`Ana Halden ${size}`} />
				</Avatar>
			))}
		</div>
	);
}
