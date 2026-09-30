import { useState } from "react";
import type { Template } from "./templates.js";

export interface TemplateAnswer {
	readonly ok: boolean;
	readonly failure?: string | null;
}

export type OnUseTemplate = (
	template: Template,
	onStep: (step: string | null) => void,
) => Promise<TemplateAnswer | null | undefined> | TemplateAnswer | null | undefined;

export interface TemplateBuildState {
	readonly isBusy: boolean;
	readonly step: string | null;
	readonly failure: string | null;
}

interface TemplateBuild extends TemplateBuildState {
	readonly press: () => Promise<void>;
}

const REFUSED = "This template could not be created.";
const IDLE: TemplateBuildState = { isBusy: false, step: null, failure: null };

export function useTemplateBuild(template: Template, onUse: OnUseTemplate | null | undefined): TemplateBuild {
	const [state, setState] = useState<TemplateBuildState>(IDLE);
	const press = async (): Promise<void> => {
		if (state.isBusy) return;
		setState({ ...IDLE, isBusy: true });
		const done = await onUse?.(template, (step) => setState((held) => ({ ...held, step })));
		setState({ ...IDLE, failure: done?.ok ? null : (done?.failure ?? REFUSED) });
	};
	return { ...state, press };
}
