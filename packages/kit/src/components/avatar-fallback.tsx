import { createElement as h } from "react";
import type { ReactElement } from "react";
import { EmblemFallback } from "./emblem-fallback";
import type { EmblemFallbackProps } from "./emblem-fallback";

export function AvatarFallback(props: EmblemFallbackProps): ReactElement {
	return <EmblemFallback data-slot="avatar-fallback" {...props} />;
}
