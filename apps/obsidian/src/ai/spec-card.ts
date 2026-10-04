import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";
import {
	keptFeaturesOf,
	withChoicePicked,
	withFeatureToggled,
	withRecordVerbToggled,
	withReferenceToggled,
} from "@widgetarium/core/app-spec.js";
import type { AppSpec, RecordVerb } from "@widgetarium/core/app-spec.js";
import { useSpec } from "./use-spec.js";
import type { HeldSpec } from "./use-spec.js";
import { foldedRows, plainRow, platedRows, pressableRow, rowText, useFolds } from "./spec-rows.js";
import type { Fold } from "./spec-rows.js";
import type { SpecPort } from "./spec-port.js";
import { SpecTitle } from "./spec-title.js";
import { FeatureRow } from "./feature-row.js";
import { ChoiceRow } from "./choice-row.js";
import { RecordRow } from "./record-row.js";
import { ResearchRow } from "./research-row.js";

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
const RECORDS = "What you can do with them";
const DETAILS = "Details";
const DETAILS_SAID = "{pages} pages · not included · {checks} checks";
const RESEARCH = "References";
const PAGES = "Pages";
const EXCLUDED = "Not included";
const CHECKS = "Done when";
const BUILD_ALL = "Build it";
const BUILD_SOME = "Build {kept} features";
const CHANGE = "Change";

export function SpecCard({ app, port, isAnswerable, onBuild, onChange }: SpecCardProps): ReactElement | null {
	const held = useSpec(port, app);
	const [isOpen, setOpen] = useState(false);
	const foldFor = useFolds();
	if (!held.read) return null;
	if (held.read.refusal !== undefined) return h("p", { className: "wg-ai-spec-refused" }, held.read.refusal);
	const { spec } = held.read;
	return h("section", { className: "wg-ai-spec" }, [
		...answeredRows({ spec, held }, !isAnswerable, foldFor),
		choiceRows({ spec, held }, { isOpen, onToggle: () => setOpen(!isOpen) }, foldFor("choices")),
		isOpen ? specDetails(spec) : null,
		held.problem ? h("p", { key: "problem", className: "wg-ai-spec-refused" }, held.problem) : null,
		isAnswerable ? specButtons(spec, onBuild, onChange) : null,
	]);
}

function answeredRows(card: CardSpec, isLocked: boolean, foldFor: (section: string) => Fold): ReactElement[] {
	return [
		h(SpecTitle, { key: "title", title: card.spec.app, said: card.spec.job }),
		referenceRows(card, isLocked, foldFor("research")),
		featureRows(card, isLocked, foldFor("features")),
		recordRows(card, isLocked, foldFor("records")),
	];
}

function featureRows({ spec, held }: CardSpec, isLocked: boolean, fold: Fold): ReactElement {
	const kept = keptFeaturesOf(spec).length;
	const all = spec.features.length;
	const label = kept === all ? FEATURES : FEATURES_KEPT.replace("{kept}", String(kept)).replace("{all}", String(all));
	const toggle = (title: string) => () => held.change((text) => withFeatureToggled(text, title));
	return foldedRows(
		"features",
		label,
		spec.features.map((feature) =>
			h(FeatureRow, { key: feature.title, feature, isLocked, onToggle: toggle(feature.title) }),
		),
		fold,
	);
}

function recordRows({ spec, held }: CardSpec, isLocked: boolean, fold: Fold): ReactElement {
	const toggle = (name: string) => (verb: RecordVerb) => held.change((text) => withRecordVerbToggled(text, name, verb));
	return foldedRows(
		"records",
		RECORDS,
		spec.records.map((record) => h(RecordRow, { key: record.name, record, isLocked, onToggle: toggle(record.name) })),
		fold,
	);
}

function referenceRows({ spec, held }: CardSpec, isLocked: boolean, fold: Fold): ReactElement {
	const toggle = (product: string) => () => held.change((text) => withReferenceToggled(text, product));
	const rows = spec.research.map((one) =>
		h(ResearchRow, { key: one.product, research: one, isLocked, onToggle: toggle(one.product) }),
	);
	return foldedRows("research", RESEARCH, rows, fold);
}

function choiceRows({ spec, held }: CardSpec, details: Fold, fold: Fold): ReactElement {
	const pick = (name: string) => (picked: string) => held.change((text) => withChoicePicked(text, name, picked));
	const rows = [
		...spec.choices.map((choice) => h(ChoiceRow, { key: choice.name, choice, onPick: pick(choice.name) })),
		pressableRow({ ...details, className: "is-details" }, [
			h("span", { key: "tile", className: "wg-ai-spec-tile" }, h(Icon, { name: "list", size: 16 })),
			rowText(DETAILS, detailsSaidOf(spec)),
		]),
	];
	return spec.choices.length > 0 ? foldedRows("choices", CHOSEN, rows, fold) : platedRows("choices", null, rows);
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
