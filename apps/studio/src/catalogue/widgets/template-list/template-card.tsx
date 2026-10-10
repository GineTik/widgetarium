import { createElement as h } from "react";
import type { CommandAnswer } from "@widgetarium/core/gateway/run-handler.js";
import { Card, Icon, IconButton } from "@widgetarium/kit";
import { SketchRegion } from "./sketch-region.js";
import type { Template } from "./types.js";
import { useCommandPress } from "./use-command-press.js";

const CREATE = "Create a page from {template}";
const WRITING = "Writing the page…";

interface TemplateCardProps {
	readonly template: Template;
	readonly create: (asked: { template: string }) => Promise<CommandAnswer>;
}

export function TemplateCard({ template, create }: TemplateCardProps) {
	const { isBusy, failure, press } = useCommandPress(() => create({ template: template.id }));
	const label = CREATE.replace("{template}", template.title);
	return (
		<Card asChild className="wg-studio-catalogue-tpl">
			<article role="button" tabIndex={0} aria-label={label} onClick={press}>
				<Card className="wg-studio-catalogue-tpl-stage">
					<div className="wg-studio-catalogue-tpl-sketch">
						{template.sketch.map((region) => (
							<SketchRegion key={region.name} region={region} />
						))}
					</div>
				</Card>
				<div className="wg-studio-catalogue-tpl-foot">
					<span className="wg-studio-catalogue-tpl-name">{template.title}</span>
					<IconButton
						variant="accent"
						size="s"
						label={label}
						disabled={isBusy}
						onClick={(event) => {
							event.stopPropagation();
							press();
						}}
					>
						<Icon name="plus" size={15} />
					</IconButton>
				</div>
				<p className="wg-studio-catalogue-tpl-what">{template.description}</p>
				{isBusy ? <p className="wg-studio-catalogue-tpl-step">{WRITING}</p> : null}
				{failure ? <p className="wg-studio-catalogue-tpl-step is-failure">{failure}</p> : null}
			</article>
		</Card>
	);
}
