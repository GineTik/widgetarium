import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Badge, Button, Icon } from "../../index";

export function ShadcnButtons(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<div className="wg-showcase-row">
				<Button variant="default">Default</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="link">Link</Button>
				<Button variant="destructive">Destructive</Button>
			</div>
			<div className="wg-showcase-row">
				<Button size="sm">Small</Button>
				<Button size="lg">Large</Button>
				<Button size="icon" variant="outline" aria-label="Search">
					<Icon name="search" size={16} />
				</Button>
				<Badge variant="default">Default</Badge>
				<Badge variant="secondary">Secondary</Badge>
				<Badge variant="destructive">Destructive</Badge>
				<Badge variant="outline">Outline</Badge>
			</div>
		</div>
	);
}
