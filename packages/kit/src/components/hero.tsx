import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BadgeColor } from "../constants/tones";
import { HeroArt } from "./hero-art";
import { cn } from "../utils/cn";

export interface HeroProps {
	readonly title: string;
	readonly eyebrow?: string | undefined;
	readonly text?: string | undefined;
	readonly photo?: string | undefined;
	readonly tones?: readonly BadgeColor[] | undefined;
	readonly action?: ReactNode;
	readonly corner?: ReactNode;
	readonly className?: string | undefined;
}

export function Hero({ title, eyebrow, text, photo, tones, action, corner, className: cls }: HeroProps): ReactElement {
	return (
		<section className={cn("wg-kit-hero", photo ? "is-photo" : "is-art", cls)}>
			{photo ? <img className="wg-kit-hero-picture" src={photo} alt="" /> : <HeroArt tones={tones} />}
			<span className="wg-kit-hero-words">
				{eyebrow ? <span className="wg-kit-hero-eyebrow">{eyebrow}</span> : null}
				<b className="wg-kit-hero-title">{title}</b>
				{text ? <span className="wg-kit-hero-text">{text}</span> : null}
				{action ? <span className="wg-kit-hero-action">{action}</span> : null}
			</span>
			{corner ? <span className="wg-kit-hero-corner">{corner}</span> : null}
		</section>
	);
}
