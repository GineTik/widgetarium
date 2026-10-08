import { useControllableState } from "./use-controllable-state";
import type { QuestionnaireAsk } from "./use-questionnaire-machine";

export function useActiveItem(
	ask: QuestionnaireAsk,
	order: readonly string[],
): [string | undefined, (name: string) => void] {
	const [chosen, choose] = useControllableState<string | undefined>({
		prop: ask.item,
		defaultProp: ask.defaultItem,
		onChange: (next) => next !== undefined && ask.onItemChange?.(next),
	});
	if (chosen !== undefined && order.includes(chosen)) return [chosen, choose];
	return [order[0], choose];
}
