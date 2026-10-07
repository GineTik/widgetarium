import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Emblem } from "./emblem";
import type { EmblemProps } from "./emblem";

export { AvatarFallback } from "./avatar-fallback";
export { AvatarImage } from "./avatar-image";

export function Avatar(props: EmblemProps): ReactElement {
	return <Emblem data-slot="avatar" {...props} />;
}
