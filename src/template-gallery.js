import { createElement as h, useState } from "react";
import { Card, Icon, IconButton } from "./kit.js";
import { templateSketch } from "./templates.js";

const tallestOf = (row) => row.reduce((most, cell) => Math.max(most, cell.height ?? 0), 0);

const CREATE_LABEL = "Create a page from {template}";
const INSTALLING = "Installing {widget}…";
const WRITING = "Writing the page…";
const REFUSED = "This template could not be created.";
const IDLE = { isBusy: false, step: null, failure: null };

const labelFor = (template) => CREATE_LABEL.replace("{template}", template.title);

function SketchRow({ row, nameOf }) {
	return h(
		"div",
		{ className: "wg-tpl-row", style: { flexGrow: tallestOf(row) } },
		row.map((cell) =>
			h("span", { key: cell.id, className: "wg-tpl-cell", style: { flexGrow: cell.ratio } }, nameOf(cell.widget)),
		),
	);
}

function SketchRegion({ region, nameOf }) {
	return h(
		"div",
		{ className: `wg-tpl-region is-${region.name}` },
		region.rows.map((row, at) => h(SketchRow, { key: at, row, nameOf })),
	);
}

function Sketch({ template, nameOf }) {
	return h(
		"div",
		{ className: "wg-tpl-sketch" },
		templateSketch(template).map((region) => h(SketchRegion, { key: region.name, region, nameOf })),
	);
}

function useBuild(template, onUse) {
	const [state, setState] = useState(IDLE);
	const press = async () => {
		if (state.isBusy) return;
		setState({ ...IDLE, isBusy: true });
		const done = await onUse?.(template, (step) => setState((held) => ({ ...held, step })));
		setState({ ...IDLE, failure: done?.ok ? null : (done?.failure ?? REFUSED) });
	};
	return { ...state, press };
}

function CreateButton({ template, isBusy, press }) {
	const take = (event) => {
		event.stopPropagation();
		press();
	};
	return h(
		IconButton,
		{
			className: "wg-cat-go",
			variant: "accent",
			size: "s",
			label: labelFor(template),
			disabled: isBusy,
			onClick: take,
		},
		h(Icon, { name: "plus", size: 15 }),
	);
}

function TemplateFoot({ template, isBusy, press }) {
	return h("div", { className: "wg-tpl-foot" }, [
		h("span", { className: "wg-tpl-name", key: "name" }, template.title),
		h(CreateButton, { key: "go", template, isBusy, press }),
	]);
}

function TemplateNote({ isBusy, step, failure }) {
	if (isBusy) return h("p", { className: "wg-tpl-step" }, step ? INSTALLING.replace("{widget}", step) : WRITING);
	if (failure) return h("p", { className: "wg-cat-lack is-failure" }, failure);
	return null;
}

function cardHandle(template, press) {
	const onKeyDown = (event) => (event.key === "Enter" || event.key === " ") && press();
	return { role: "button", tabIndex: 0, "aria-label": labelFor(template), onClick: press, onKeyDown };
}

function TemplateCard({ template, nameOf, onUse }) {
	const { step, isBusy, failure, press } = useBuild(template, onUse);
	return h(
		Card,
		{ asChild: true, className: "wg-tpl-tile" },
		h("article", cardHandle(template, press), [
			h("div", { className: "wg-tpl-stage", key: "stage" }, h(Sketch, { template, nameOf })),
			h(TemplateFoot, { key: "foot", template, isBusy, press }),
			h("p", { className: "wg-tpl-what", key: "what" }, template.description),
			h(TemplateNote, { key: "note", isBusy, step, failure }),
		]),
	);
}

export function TemplateGrid({ templates, columns, nameOf, onUse }) {
	return h(
		"div",
		{ className: "wg-tpl-grid", style: { "--wg-cat-columns": columns } },
		templates.map((template) => h(TemplateCard, { key: template.id, template, nameOf, onUse })),
	);
}
