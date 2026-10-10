import { useEffect, useState } from "react";

const waiting: (() => void)[] = [];
let isTurning = false;

export function useMountedInTurn(isSeen: boolean): boolean {
	const [isMounted, setMounted] = useState(false);
	useEffect(() => {
		if (!isSeen || isMounted) return;
		let isCancelled = false;
		waitForTurn(() => {
			if (!isCancelled) setMounted(true);
		});
		return () => {
			isCancelled = true;
		};
	}, [isSeen, isMounted]);
	return isMounted;
}

function waitForTurn(mount: () => void): void {
	waiting.push(mount);
	if (!isTurning) nextTurn();
}

function nextTurn(): void {
	const mount = waiting.shift();
	isTurning = mount !== undefined;
	if (!mount) return;
	window.requestIdleCallback(
		() => {
			mount();
			window.requestAnimationFrame(nextTurn);
		},
		{ timeout: 200 },
	);
}
