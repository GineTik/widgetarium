import { createElement as h } from "react";
import type { ReactElement } from "react";
import { EmblemImage } from "./emblem-image";
import type { EmblemImageProps } from "./emblem-image";

export function AvatarImage(props: EmblemImageProps): ReactElement {
	return <EmblemImage data-slot="avatar-image" {...props} />;
}
