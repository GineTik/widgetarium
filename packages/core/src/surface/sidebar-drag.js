import { sidebarWidth, widenedBox, withWidth } from "../tree.js";

export function sidebarGrip({ width, commitLayout }, { sidebarRef, pageRef }, root) {
	return (at, toward) => (event) => {
		event.preventDefault();
		event.stopPropagation();
		dragUntilDropped(sidebarRef, event, {
			...sidebarRecipe({ root, at, toward, event, width, pageRef }),
			commit: (given) => commitLayout((held) => withWidth(held, [at], given)),
		});
	};
}

function dragUntilDropped(dragRef, event, { read, paint, commit }) {
	event.preventDefault();
	event.stopPropagation();
	let latest = null;
	let shown = null;
	const draw = () => shown !== null && paint(shown);
	const move = (moved) => {
		latest = read(moved, false);
		shown = read(moved, true);
		draw();
	};
	const stop = () => {
		window.removeEventListener("pointermove", move);
		window.removeEventListener("pointerup", stop);
		document.body.classList.remove("wg-tree-dragging");
		dragRef.current = null;
		if (latest === null) return;
		shown = latest;
		draw();
		commit(latest);
	};
	dragRef.current = { stop, repaint: draw };
	document.body.classList.add("wg-tree-dragging");
	window.addEventListener("pointermove", move);
	window.addEventListener("pointerup", stop);
}

function sidebarRecipe({ root, at, toward, event, width, pageRef }) {
	const held = sidebarWidth(root, at);
	const grabbed = event.clientX;
	const node = pageRef.current?.querySelector(`.wg-tree-region[data-region="${at}"]`);
	const wantedAt = (pointer) => held + (pointer.clientX - grabbed) * toward;
	return {
		read: (pointer, give) => widenedBox(root, at, { wantedPx: wantedAt(pointer), width, give }),
		paint: (given) => {
			if (node) node.style.flexBasis = `${given}px`;
		},
	};
}
