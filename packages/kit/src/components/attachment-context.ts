import { createContext } from "react";
import type { Context } from "react";

export const AttachmentBusyContext: Context<boolean> = createContext<boolean>(false);
