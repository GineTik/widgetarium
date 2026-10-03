import type { CommandAnswer } from "widgetarium";
import { Card, Icon, IconButton } from "widgetarium/kit";
import { SketchRegion } from "./sketch-region";
import type { Template } from "./types";
import { useCommandPress } from "./use-command-press";

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
		<Card asChild className="wg-catalogue-tpl">
			<article role="button" tabIndex={0} aria-label={label} onClick={press}>
				<Card className="wg-catalogue-tpl-stage">
					<div className="wg-catalogue-tpl-sketch">
						{template.sketch.map((region) => (
							<SketchRegion key={region.name} region={region} />
						))}
					</div>
				</Card>
				<div className="wg-catalogue-tpl-foot">
					<span className="wg-catalogue-tpl-name">{template.title}</span>
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
				<p className="wg-catalogue-tpl-what">{template.description}</p>
				{isBusy ? <p className="wg-catalogue-tpl-step">{WRITING}</p> : null}
				{failure ? <p className="wg-catalogue-tpl-step is-failure">{failure}</p> : null}
			</article>
		</Card>
	);
}
