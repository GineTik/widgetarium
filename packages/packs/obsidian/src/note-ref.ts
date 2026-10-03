import type { RecordRef } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";

export const recordRefOf = (path: string): RecordRef => rowOf<object>({}, path).ref;
