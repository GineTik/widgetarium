import { createContext } from "react";
import type { Context, RefObject } from "react";

const NO_ASKER: RefObject<Element | null> = { current: null };

export const CatalogueAsker: Context<RefObject<Element | null>> = createContext(NO_ASKER);
