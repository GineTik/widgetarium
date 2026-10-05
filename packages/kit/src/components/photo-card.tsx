import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BadgeColor } from "../constants/tones";
import { Icon } from "../icons/icon";
import { Picture } from "./photo-card-picture";
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
	const words = (
		<span className="wg-kit-photo-card-words">
			<b>{title}</b>
			{subtitle ? <span>{subtitle}</span> : null}
			{meta ? <span className="is-meta">{meta}</span> : null}
		</span>
	);
	return (
		<article className={cn("wg-kit-photo-card", `is-${shape}`, isTextOnPhoto && "is-text-on-photo", cls)}>
			<span className="wg-kit-photo-card-picture">
				<Picture {...props} />
				{badge ? <span className="wg-kit-photo-card-badge">{badge}</span> : null}
				{onOpen ? (
					<button type="button" className="wg-kit-photo-card-open" aria-label={title} onClick={onOpen}>
						<Icon name="arrow-up-right" />
					</button>
				) : null}
				{isTextOnPhoto ? words : null}
			</span>
			{isTextOnPhoto ? null : words}
			{children}
		</article>
	);
}
