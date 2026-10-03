import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import { keptFeaturesOf, withChoicePicked, withFeatureToggled } from "@widgetarium/core/app-spec.js";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { useSpec } from "./use-spec.js";
import type { HeldSpec } from "./use-spec.js";
import { plainRow, platedRows, pressableRow, rowText } from "./spec-rows.js";
import type { SpecPort } from "./spec-port.js";
import { SpecTitle } from "./spec-title.js";
import { FeatureRow } from "./feature-row.js";
import { ChoiceRow } from "./choice-row.js";

export interface SpecCardProps {
	readonly app: string;
	readonly port: SpecPort;
	readonly isAnswerable: boolean;
	readonly onBuild: () => void;
	readonly onChange: () => void;
}

interface CardSpec {
	readonly spec: AppSpec;
	readonly held: HeldSpec;
}

const FEATURES = "Features";
const FEATURES_KEPT = "Features · {kept} of {all}";
const CHOSEN = "I chose for you";
const DETAILS = "Details";
const DETAILS_SAID = "{pages} pages · not included · {checks} checks";
const PAGES = "Pages";
const EXCLUDED = "Not included";
const CHECKS = "Done when";
const BUILD_ALL = "Build it";
const BUILD_SOME = "Build {kept} features";
const CHANGE = "Change";

export function SpecCard({ app, port, isAnswerable, onBuild, onChange }: SpecCardProps): ReactElement | null {
	const held = useSpec(port, app);
	const [isOpen, setOpen] = useState(false);
	if (!held.read) return null;
	if (held.read.refusal !== undefined) return h("p", { className: "wg-ai-spec-refused" }, held.read.refusal);
	const { spec } = held.read;
	return h("section", { className: "wg-ai-spec" }, [
		h(SpecTitle, { key: "title", title: spec.app, said: spec.job }),
		featureRows({ spec, held }),
		choiceRows({ spec, held }, { isOpen, onToggle: () => setOpen(!isOpen) }),
		isOpen ? specDetails(spec) : null,
		held.problem ? h("p", { key: "problem", className: "wg-ai-spec-refused" }, held.problem) : null,
		isAnswerable ? specButtons(spec, onBuild, onChange) : null,
	]);
}

function featureRows({ spec, held }: CardSpec): ReactElement {
	const kept = keptFeaturesOf(spec).length;
	const all = spec.features.length;
	const label = kept === all ? FEATURES : FEATURES_KEPT.replace("{kept}", String(kept)).replace("{all}", String(all));
	const toggle = (title: string) => () => held.change((text) => withFeatureToggled(text, title));
	return platedRows(
		"features",
		label,
		spec.features.map((feature) => h(FeatureRow, { key: feature.title, feature, onToggle: toggle(feature.title) })),
	);
}

function choiceRows({ spec, held }: CardSpec, details: { isOpen: boolean; onToggle: () => void }): ReactElement {
	const pick = (name: string) => (picked: string) => held.change((text) => withChoicePicked(text, name, picked));
	return platedRows("choices", spec.choices.length > 0 ? CHOSEN : null, [
		...spec.choices.map((choice) => h(ChoiceRow, { key: choice.name, choice, onPick: pick(choice.name) })),
		pressableRow(details, [
			h("span", { key: "tile", className: "wg-ai-spec-tile" }, h(Icon, { name: "list", size: 16 })),
			rowText(DETAILS, detailsSaidOf(spec)),
		]),
	]);
}

function detailsSaidOf(spec: AppSpec): string {
	return DETAILS_SAID.replace("{pages}", String(spec.pages.length)).replace("{checks}", String(spec.checks.length));
}

function specDetails(spec: AppSpec): ReactElement {
	const pages = spec.pages.map((page) => plainRow(page.name, page.name, page.says));
	const excluded = [plainRow("excluded", spec.excluded.join(", "), null)];
	const checks = spec.checks.map((check, at) => plainRow(at, check, null));
	return h("div", { key: "details", className: "wg-ai-spec-details" }, [
		platedRows("pages", PAGES, pages),
		spec.excluded.length > 0 ? platedRows("excluded", EXCLUDED, excluded) : null,
		platedRows("checks", CHECKS, checks),
	]);
}

function specButtons(spec: AppSpec, onBuild: () => void, onChange: () => void): ReactElement {
	const kept = keptFeaturesOf(spec).length;
	const build = kept === spec.features.length ? BUILD_ALL : BUILD_SOME.replace("{kept}", String(kept));
	return h("div", { key: "buttons", className: "wg-ai-spec-buttons" }, [
		h(
			Button,
			{ key: "build", variant: "accent", size: "l", block: true, disabled: kept === 0, onClick: onBuild },
			build,
		),
		h(Button, { key: "change", variant: "neutral", size: "l", block: true, onClick: onChange }, CHANGE),
	]);
}
