import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "../../index";

export function ButtonsDemo(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<div className="wg-showcase-row">
				<Button variant="default">Create</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="link">Link</Button>
				<Button variant="destructive">Delete</Button>
			</div>
			<div className="wg-showcase-row">
				<Button size="sm">Small</Button>
				<Button size="default">Default</Button>
				<Button size="lg" variant="default">
					Large
				</Button>
			</div>
			<div className="wg-showcase-row">
				<Button isLoading>Saving</Button>
				<Button isDone>Saved</Button>
				<Button disabled>Disabled</Button>
				<Button size="icon" variant="ghost" aria-label="Search">
					<Icon name="search" />
				</Button>
				<Button size="icon" variant="ghost" aria-label="Settings">
					<Icon name="settings" />
				</Button>
			</div>
		</div>
	);
}
