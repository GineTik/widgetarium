import { createElement as h, useContext } from "react";
import type { ImgHTMLAttributes, ReactElement } from "react";
import { EMBLEM_STATUS } from "../constants/emblem";
import { useImageProbe } from "../hooks/use-image-probe";
import { cn } from "../utils/cn";

export interface EmblemImageProps extends ImgHTMLAttributes<HTMLImageElement> {
	readonly src?: string | undefined;
}

export function EmblemImage({ src, alt = "", className: cls, ...rest }: EmblemImageProps): ReactElement | null {
	const { status, setStatus } = useContext(EMBLEM_STATUS);
	useImageProbe(src, setStatus);
	if (status !== "loaded") return null;
	return <img {...rest} src={src} alt={alt} className={cn("wg-kit-emblem-image", cls)} draggable={false} />;
}
