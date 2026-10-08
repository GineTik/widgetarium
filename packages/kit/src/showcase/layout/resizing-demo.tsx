import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Card, ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../../index";

export function Resizing(): ReactElement {
	return (
		<Card style={{ height: "180px" }}>
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel defaultSize={40} minSize={20}>
					<div className="wg-showcase-pane">Notes</div>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel>
					<ResizablePanelGroup direction="vertical">
						<ResizablePanel defaultSize={60}>
							<div className="wg-showcase-pane">Preview</div>
						</ResizablePanel>
						<ResizableHandle />
						<ResizablePanel>
							<div className="wg-showcase-pane">Outline</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>
			</ResizablePanelGroup>
		</Card>
	);
}
