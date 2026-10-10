import { CATALOGUE_COPY_DIR } from "@widgetarium/core/paths.js";
import { LAID_MARK_FILE, readLaidMark } from "./ai/agent-files.js";
import type { AgentFilesAdapter } from "./ai/agent-files.js";

export async function removeLaidCatalogue(adapter: AgentFilesAdapter): Promise<boolean> {
	if ((await readLaidMark(adapter, `${CATALOGUE_COPY_DIR}/${LAID_MARK_FILE}`)) === null) return false;
	await adapter.rmdir(CATALOGUE_COPY_DIR, true);
	return true;
}
