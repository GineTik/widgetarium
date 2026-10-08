import { createElement as h, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { Button, Dialog } from "@widgetarium/kit";

const twinHost = document.getElementById("host");
if (!twinHost) throw new Error("dialog twin: the page has no #host");
createRoot(twinHost).render(
	<Dialog
		isOpen
		size={location.hash === "#small" ? "s" : "m"}
		title="Rename board"
		onClose={() => undefined}
		actions={
			<>
				<Button>Cancel</Button>
				<Button>Save</Button>
			</>
		}
	>
		<p style={{ margin: 0 }}>A board keeps its tiles when it is renamed. Links to it follow the new name.</p>
	</Dialog>,
);
