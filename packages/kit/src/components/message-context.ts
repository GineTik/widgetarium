import { createContext } from "react";
import type { Context } from "react";
import type { ChatAlign } from "../constants/chat";

export const MessageAlignContext: Context<ChatAlign> = createContext<ChatAlign>("start");
