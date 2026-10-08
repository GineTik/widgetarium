import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { OverlaysShowcase, openedFromHash } from "../packages/kit/src/showcase/index";

const shotHost = document.getElementById("demo");
if (!shotHost) throw new Error("overlay shot: the page has no #demo");
createRoot(shotHost).render(
	<div className="wg-showcase">
		<OverlaysShowcase opened={openedFromHash(location.hash)} />
	</div>,
);
