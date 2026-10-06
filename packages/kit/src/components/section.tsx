import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { dataAttributesOf } from "../utils/data-attributes";
import type { DataAttributes } from "../utils/data-attributes";
import { Button } from "./button";
import { Count } from "./count";
import { Heading } from "./heading";

export interface SectionMore {
	readonly label: string;
	readonly onPress?: (() => void) | undefined;
}

export interface SectionProps extends DataAttributes {
	readonly title: string;
	readonly count?: ReactNode;
	readonly action?: ReactNode;
	readonly secondary?: ReactNode;
	readonly more?: SectionMore | undefined;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function Section({
	title,
	count,
	action,
	secondary,
	more,
	className: cls,
	children,
	...rest
}: SectionProps): ReactElement {
	return (
		<section
			{...dataAttributesOf(rest)}
			data-name={rest["data-name"] ?? title}
			className={cn("wg-kit-section", cls)}
			data-wg-section=""
		>
			<header className="wg-kit-section-head">
				<Heading level={2} size={4} className="wg-kit-section-title">
					{title}
				</Heading>
				{count !== undefined ? <Count>{count}</Count> : null}
				{secondary || action ? (
					<div className="wg-kit-section-actions">
						{secondary}
						{action}
					</div>
				) : null}
			</header>
			<div className="wg-kit-section-body">{children}</div>
			{more ? (
				<Button variant="plain" size="s" className="wg-kit-section-more" onClick={more.onPress}>
					{more.label}
				</Button>
			) : null}
		</section>
	);
}
