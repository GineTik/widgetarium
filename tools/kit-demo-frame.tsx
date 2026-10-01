import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Card, CodeBlock, LayoutHeader, LayoutItem } from "../packages/kit/src/index";

export interface SectionProps {
	readonly title: string;
	readonly note?: string;
	readonly usage: string;
	readonly children?: ReactNode;
}

export interface NamedProps {
	readonly name: string;
	readonly children?: ReactNode;
}

export function Section(props: SectionProps): ReactElement {
	return (
		<LayoutItem>
			<SectionBody {...props} />
		</LayoutItem>
	);
}

export function WideSection(props: SectionProps): ReactElement {
	return (
		<Card>
			<SectionBody {...props} />
		</Card>
	);
}

export function Named({ name, children }: NamedProps): ReactElement {
	return (
		<div className="demo-named">
			<span className="demo-code">{name}</span>
			{children}
		</div>
	);
}

export function Cell(props: NamedProps): ReactElement {
	return (
		<LayoutItem>
			<Named {...props} />
		</LayoutItem>
	);
}

function SectionBody({ title, note, usage, children }: SectionProps): ReactElement {
	return (
		<div className="demo-stack">
			<LayoutHeader title={title} />
			{note ? <p className="demo-note">{note}</p> : null}
			{children}
			<CodeBlock code={usage} label={`${title}, how it is written`} />
		</div>
	);
}
