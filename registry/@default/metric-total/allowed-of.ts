import type { Allowed, MetricProps } from "./types";

type RecordVerbs = Pick<MetricProps, "createRecord" | "updateRecord" | "removeRecord">;

export function allowedOf({ createRecord, updateRecord, removeRecord }: RecordVerbs): Allowed {
	return {
		canAdd: createRecord.can().can,
		canEdit: updateRecord.can().can,
		canDelete: removeRecord.can().can,
	};
}
