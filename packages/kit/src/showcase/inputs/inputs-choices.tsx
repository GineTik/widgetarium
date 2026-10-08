import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Button,
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
	Icon,
	Input,
	Kbd,
	KbdGroup,
	Label,
	RadioGroup,
	RadioGroupItem,
	Slider,
	Toggle,
} from "../../index";
import { Named } from "../frame/named";

export function InputsChoices(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Named name="RadioGroup · RadioGroupItem · Label">
				<RadioGroup defaultValue="comfortable">
					{["default", "comfortable", "compact"].map((density) => (
						<div key={density} className="wg-showcase-row">
							<RadioGroupItem value={density} id={`density-${density}`} />
							<Label htmlFor={`density-${density}`}>{density}</Label>
						</div>
					))}
				</RadioGroup>
			</Named>
			<Named name="Slider defaultValue=[50] · [20, 80]">
				<Slider defaultValue={[50]} max={100} step={1} />
				<Slider defaultValue={[20, 80]} max={100} step={5} />
			</Named>
			<Named name="Toggle · ButtonGroup · Kbd">
				<div className="wg-showcase-row">
					<Toggle aria-label="Bold" defaultPressed>
						<Icon name="bold" size={16} />
					</Toggle>
					<Toggle variant="outline" aria-label="Italic">
						<Icon name="italic" size={16} />
					</Toggle>
					<ButtonGroup>
						<Button variant="outline">Archive</Button>
						<Button variant="outline">Report</Button>
						<ButtonGroupSeparator />
						<Button variant="outline" size="icon" aria-label="More">
							<Icon name="ellipsis" size={16} />
						</Button>
					</ButtonGroup>
				</div>
				<div className="wg-showcase-row">
					<ButtonGroup>
						<ButtonGroupText>https://</ButtonGroupText>
						<Input placeholder="my-site" />
					</ButtonGroup>
					<KbdGroup>
						<Kbd>⌘</Kbd>
						<Kbd>K</Kbd>
					</KbdGroup>
				</div>
			</Named>
		</div>
	);
}
