import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SUMMARY_ICON_PX, TOOL_STAGE_LABELS, TOOL_STAGE_TONES } from "../constants/chat";
import type { ToolStage } from "../constants/chat";
import { Icon } from "../icons/icon";
import { Badge } from "./badge";
import { Spinner } from "./spinner";

export interface MessageToolSummaryProps {
	readonly name: string;
	readonly stage: ToolStage;
}

export function MessageToolSummary({ name, stage }: MessageToolSummaryProps): ReactElement {
	return (
		<summary className="wg-kit-message-summary">
			{stage === "running" ? <Spinner size={SUMMARY_ICON_PX} /> : <Icon name="wrench" size={SUMMARY_ICON_PX} />}
			<span className="wg-kit-message-tool-name">{name}</span>
			<Badge tone={TOOL_STAGE_TONES[stage]} size="s">
				{TOOL_STAGE_LABELS[stage]}
			</Badge>
			<Icon name="chevron-down" size={SUMMARY_ICON_PX} className="wg-kit-message-chevron" />
		</summary>
	);
}
