import { useMemo } from "react";
import { valueGateway } from "widgetarium";

export function useBeside(source: string, isNarrow: boolean) {
	return useMemo(
		() =>
			valueGateway<boolean>({
				id: `${source}#beside=${isNarrow}`,
				handlers: { get: () => isNarrow },
				settlesNow: true,
			}),
		[source, isNarrow],
	);
}
