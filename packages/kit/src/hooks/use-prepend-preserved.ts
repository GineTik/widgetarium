import { useLayoutEffect } from "react";

export function usePrependPreserved(setPreserved: (isPreserved: boolean) => void, isPreserved: boolean): void {
	useLayoutEffect(() => {
		setPreserved(isPreserved);
	}, [isPreserved]);
}
