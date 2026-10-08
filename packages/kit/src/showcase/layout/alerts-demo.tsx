import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle, Button, Icon } from "../../index";

export function Alerts(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Alert>
				<Icon name="info" />
				<AlertTitle>Heads up</AlertTitle>
				<AlertDescription>Widgets update when the vault does.</AlertDescription>
			</Alert>
			<Alert variant="destructive">
				<Icon name="circle-alert" />
				<AlertTitle>Sync failed</AlertTitle>
				<AlertDescription>Three notes could not be written.</AlertDescription>
				<AlertAction>
					<Button size="sm" variant="outline">
						Retry
					</Button>
				</AlertAction>
			</Alert>
			<Alert tone="success">
				<Icon name="check" />
				<AlertTitle>Backup complete</AlertTitle>
			</Alert>
		</div>
	);
}
