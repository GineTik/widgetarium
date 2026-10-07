const CHOSEN = '[aria-selected="true"]';

const SCROLLED_LIST = ".wg-kit-select-content";

export function scrollChosenIntoView(marker: HTMLElement | null): void {
	const list = marker?.closest<HTMLElement>(SCROLLED_LIST);
	if (!list) return;
	requestAnimationFrame(() => {
		const chosen = list.querySelector<HTMLElement>(CHOSEN);
		if (chosen) list.scrollTop = chosen.offsetTop - (list.clientHeight - chosen.offsetHeight) / 2;
	});
}
