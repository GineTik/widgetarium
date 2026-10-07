import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	SUMMARY_ICON_PX,
	TOOL_INPUT_LABEL,
	TOOL_OUTPUT_LABEL,
	TOOL_STAGE_LABELS,
	TOOL_STAGE_TONES,
} from "../constants/chat";
import type { ToolStage } from "../constants/chat";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { Badge } from "./badge";
import { Card } from "./card";
import { Spinner } from "./spinner";

export interface MessageToolProps {
	readonly name: string;
	readonly stage: ToolStage;
	readonly input?: unknown;
	readonly output?: unknown;
	readonly error?: string | null | undefined;
	readonly className?: string | undefined;
}

export function MessageTool({ name, stage, input, output, error, className }: MessageToolProps): ReactElement {
	return (
		<Card asChild data-slot="message-tool" data-stage={stage} className={cn("wg-kit-message-tool", className)}>
			<details>
				<summary className="wg-kit-message-summary">
					{stage === "running" ? <Spinner size={SUMMARY_ICON_PX} /> : <Icon name="wrench" size={SUMMARY_ICON_PX} />}
					<span className="wg-kit-message-tool-name">{name}</span>
					<Badge tone={TOOL_STAGE_TONES[stage]} size="s">
						{TOOL_STAGE_LABELS[stage]}
					</Badge>
					<Icon name="chevron-down" size={SUMMARY_ICON_PX} className="wg-kit-message-chevron" />
				</summary>
				{shownValue(TOOL_INPUT_LABEL, input)}
				{shownValue(TOOL_OUTPUT_LABEL, output)}
				{error ? <p className="wg-kit-message-tool-error">{error}</p> : null}
			</details>
		</Card>
	);
}

function shownValue(label: string, value: unknown): ReactElement | null {
	if (value === undefined) return null;
	return (
		<div className="wg-kit-message-tool-value">
			<span className="wg-kit-message-tool-label">{label}</span>
			<pre>{shownText(value)}</pre>
		</div>
	);
}

function shownText(value: unknown): string {
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		return String(value);
	}
}
