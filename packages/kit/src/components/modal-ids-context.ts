import { createContext } from "react";
import type { Context } from "react";
import type { ModalIds } from "../constants/overlays";

export const ModalIdsContext: Context<ModalIds> = createContext<ModalIds>({
	titleId: undefined,
	descriptionId: undefined,
});
