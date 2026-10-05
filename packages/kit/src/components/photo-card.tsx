import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BadgeColor } from "../constants/tones";
import { PhotoCardOpen } from "./photo-card-open";
import { Picture } from "./photo-card-picture";
import { PhotoCardWords } from "./photo-card-words";
import { cn } from "../utils/cn";

export interface PhotoCardProps {
	readonly title: string;
	readonly subtitle?: string | undefined;
	readonly meta?: string | undefined;
	readonly photo?: string | undefined;
	readonly seed?: unknown;
	readonly tones?: readonly BadgeColor[] | undefined;
	readonly badge?: string | undefined;
	readonly shape?: "wide" | "tall" | "square" | undefined;
	readonly isTextOnPhoto?: boolean | undefined;
	readonly onOpen?: (() => void) | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function PhotoCard(props: PhotoCardProps): ReactElement {
	const {
		title,
		subtitle,
		meta,
		badge,
		shape = "wide",
		isTextOnPhoto = false,
		onOpen,
		children,
		className: cls,
	} = props;
	const words = <PhotoCardWords title={title} subtitle={subtitle} meta={meta} />;
	return (
		<article className={cn("wg-kit-photo-card", `is-${shape}`, isTextOnPhoto && "is-text-on-photo", cls)}>
			<span className="wg-kit-photo-card-picture">
				<Picture {...props} />
				{badge ? <span className="wg-kit-photo-card-badge">{badge}</span> : null}
				<PhotoCardOpen title={title} onOpen={onOpen} />
				{isTextOnPhoto ? words : null}
			</span>
			{isTextOnPhoto ? null : words}
			{children}
		</article>
	);
}
