import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { designPathOf, readDesign } from "@widgetarium/core/app-design.js";
import type { Design, DesignRead } from "@widgetarium/core/app-design.js";
import type { SpecPort } from "./spec-port.js";

export interface DesignCardProps {
	readonly app: string;
	readonly port: SpecPort;
	readonly isAnswerable: boolean;
	readonly onOpen: () => void;
	readonly onApprove: () => void;
	readonly onChange: () => void;
}

const TITLE = "Design · {app}";
const SCREENS = "{count} screens · {names}";
const OPEN = "Open the design";
const APPROVE = "Approve design";
const CHANGE = "Change";
const PREVIEW_LINES = 4;

export function DesignCard({
	app,
	port,
	isAnswerable,
	onOpen,
	onApprove,
	onChange,
}: DesignCardProps): ReactElement | null {
	const read = useDesign(port, app);
	if (!read) return null;
	if (read.refusal !== undefined) return h("p", { className: "wg-ai-spec-refused" }, read.refusal);
	return h("section", { className: "wg-ai-spec" }, [
		openButton(app, read.design, onOpen),
		isAnswerable ? designButtons(onApprove, onChange) : null,
	]);
}

function openButton(app: string, design: Design, onOpen: () => void): ReactElement {
	return h("button", { key: "open", type: "button", className: "wg-ai-design", onClick: onOpen, title: OPEN }, [
		previewOf(design),
		h("span", { key: "said", className: "wg-ai-design-said" }, [
			h("span", { key: "text", className: "wg-ai-spec-text" }, [
				h("span", { key: "name", className: "wg-ai-spec-name" }, TITLE.replace("{app}", app)),
				h("span", { key: "sub", className: "wg-ai-spec-sub" }, screensSaid(design)),
			]),
			h(Icon, { key: "go", name: "arrow-up-right", size: 18, className: "wg-ai-design-go" }),
		]),
	]);
}

function useDesign(port: SpecPort, app: string): DesignRead | null {
	const [read, setRead] = useState<DesignRead | null>(null);
	useEffect(() => {
		const path = designPathOf(app);
		const load = (): void => void port.read(path).then((text) => setRead(text === null ? null : readDesign(text)));
		load();
		return port.watch(path, load);
	}, [port, app]);
	return read;
}

function previewOf(design: Design): ReactElement {
	const frames = design.screens.map((screen) =>
		h("span", { key: screen.name, className: "wg-ai-design-frame" }, [
			h("b", { key: "name" }, screen.name),
			...Array.from({ length: PREVIEW_LINES }, (_unused, at) =>
				h("i", { key: at, className: at === 0 ? "is-accent" : undefined }),
			),
		]),
	);
	return h("span", { key: "preview", className: "wg-ai-design-preview" }, frames);
}

function screensSaid(design: Design): string {
	const names = design.screens.map((screen) => screen.name).join(", ");
	return SCREENS.replace("{count}", String(design.screens.length)).replace("{names}", names);
}

function designButtons(onApprove: () => void, onChange: () => void): ReactElement {
	return h("div", { key: "buttons", className: "wg-ai-spec-buttons" }, [
		h(Button, { key: "approve", variant: "accent", size: "l", block: true, onClick: onApprove }, APPROVE),
		h(Button, { key: "change", variant: "neutral", size: "l", block: true, onClick: onChange }, CHANGE),
	]);
}
