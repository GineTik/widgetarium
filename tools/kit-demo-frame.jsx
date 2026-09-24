import { createElement as h } from "react";
import { Card, CodeBlock, LayoutHeader, LayoutItem } from "../packages/kit/src/index";

export function Section(props) {
	return (
		<LayoutItem>
			<SectionBody {...props} />
		</LayoutItem>
	);
}

export function WideSection(props) {
	return (
		<Card>
			<SectionBody {...props} />
		</Card>
	);
}

export function Named({ name, children }) {
	return (
		<div className="demo-named">
			<span className="demo-code">{name}</span>
			{children}
		</div>
	);
}

export function Cell(props) {
	return (
		<LayoutItem>
			<Named {...props} />
		</LayoutItem>
	);
}

function SectionBody({ title, note, usage, children }) {
	return (
		<div className="demo-stack">
			<LayoutHeader title={title} />
			{note ? <p className="demo-note">{note}</p> : null}
			{children}
			<CodeBlock code={usage} label={`${title}, how it is written`} />
		</div>
	);
}
