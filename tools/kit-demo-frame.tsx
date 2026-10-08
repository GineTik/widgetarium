import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Card, CodeBlock, LayoutHeader, LayoutItem } from "../packages/kit/src/index";
import { NO_SURFACE } from "../packages/kit/src/utils/surface";

export interface SectionProps {
	readonly title: string;
	readonly note?: string | undefined;
	readonly usage: string;
	readonly paintsPlates?: boolean | undefined;
	readonly children?: ReactNode;
}

export function Section(props: SectionProps): ReactElement {
	if (props.paintsPlates)
		return (
			<Card type={NO_SURFACE} className="wg-showcase-bare">
				<SectionBody {...props} />
			</Card>
		);
	return (
		<LayoutItem>
			<SectionBody {...props} />
		</LayoutItem>
	);
}

export function WideSection(props: SectionProps): ReactElement {
	return (
		<Card
			type={props.paintsPlates ? NO_SURFACE : undefined}
			className={props.paintsPlates ? "wg-showcase-bare" : undefined}
		>
			<SectionBody {...props} />
		</Card>
	);
}

function SectionBody({ title, note, usage, children }: SectionProps): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<LayoutHeader title={title} />
			{note ? <p className="wg-showcase-note">{note}</p> : null}
			{children}
			<CodeBlock code={usage} label={`${title}, how it is written`} />
		</div>
	);
}
