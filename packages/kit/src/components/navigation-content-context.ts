import { createContext } from "react";
import type { Context } from "react";

export const NavigationContentContext: Context<boolean> = createContext(false);
