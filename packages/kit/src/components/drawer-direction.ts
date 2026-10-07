import { createContext } from "react";
import type { Context } from "react";
import type { ModalSide } from "./modal-layer";

export const DrawerDirectionContext: Context<ModalSide> = createContext<ModalSide>("bottom");
