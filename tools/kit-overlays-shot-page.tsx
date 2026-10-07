import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { OverlaysShowcase, openedFromHash } from "./kit-demo-overlays.tsx";

const shotHost = document.getElementById("demo");
if (!shotHost) throw new Error("overlay shot: the page has no #demo");
createRoot(shotHost).render(<OverlaysShowcase opened={openedFromHash(location.hash)} />);
