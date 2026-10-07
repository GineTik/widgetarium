import { createContext } from "react";
import type { Context } from "react";

export interface ModalIds {
	readonly titleId: string | undefined;
	readonly descriptionId: string | undefined;
}

export const ModalIdsContext: Context<ModalIds> = createContext<ModalIds>({
	titleId: undefined,
	descriptionId: undefined,
});
