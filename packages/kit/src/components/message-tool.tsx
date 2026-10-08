import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TOOL_INPUT_LABEL, TOOL_OUTPUT_LABEL, TOOL_RAW_INPUT_LABEL } from "../constants/chat";
import type { ToolStage } from "../constants/chat";
import { cn } from "../utils/cn";
import { toolTextOf } from "../utils/tool-text";
import { Card } from "./card";
import { MessageToolSummary } from "./message-tool-summary";

export interface MessageToolProps {
	readonly name: string;
	readonly stage: ToolStage;
	readonly input?: unknown;
	readonly isInputRaw?: boolean | undefined;
	readonly output?: unknown;
	readonly error?: string | null | undefined;
	readonly className?: string | undefined;
}

export function MessageTool({
	name,
	stage,
	input,
	isInputRaw = false,
	output,
	error,
	className,
}: MessageToolProps): ReactElement {
	return (
		<Card asChild data-slot="message-tool" data-stage={stage} className={cn("wg-kit-message-tool", className)}>
			<details>
				<MessageToolSummary name={name} stage={stage} />
				{toolValueRow(isInputRaw ? TOOL_RAW_INPUT_LABEL : TOOL_INPUT_LABEL, input)}
				{toolValueRow(TOOL_OUTPUT_LABEL, output)}
				{error ? <p className="wg-kit-message-tool-error">{error}</p> : null}
			</details>
		</Card>
	);
}

function toolValueRow(label: string, value: unknown): ReactElement | null {
	if (value === undefined) return null;
	return (
		<div className="wg-kit-message-tool-value">
			<span className="wg-kit-message-tool-label">{label}</span>
			<pre>{toolTextOf(value)}</pre>
		</div>
	);
}
