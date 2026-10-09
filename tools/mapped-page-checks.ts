import { z } from "zod";
import { collectionGateway, applyQuery } from "../packages/core/src/gateway/create.ts";
import type { Query } from "../packages/core/src/gateway/contract.ts";
import { fieldsOf } from "../packages/core/src/gateway/fields.ts";
import { mapCollection } from "../packages/core/src/gateway/mapped.ts";
import { parseReadsBy } from "../packages/core/src/gateway/parsed.ts";
import { createProblems, UnansweredFilterError } from "../packages/core/src/gateway/problems.ts";
import type { DeclaredNeeds } from "../packages/core/src/gateway/resolve-needs.ts";

type Check = (name: string, ok: unknown, detail?: string) => void;

const WANTING: DeclaredNeeds = { colour: { type: "text", required: true } };
const RED_ONLY = [{ prop: "colour", op: "is", value: "red" }];
const NOTES = [{ title: "Reading" }];

export async function checkMappedPages(check: Check): Promise<void> {
	await checkSortReported(check);
	await checkPagedFilterRefused(check);
	await checkPageWithoutItemsRefused(check);
}

async function checkSortReported(check: Check): Promise<void> {
	const problems = createProblems();
	const mapped = mapCollection(folderOf("folder:sorted"), {
		needs: WANTING,
		report: problems.contextFor("t1/sorted", z.unknown()).report,
	});
	await mapped.list({ sort: [{ prop: "colour", dir: "desc" }] });
	const labels = problems.of("t1/sorted").map((problem) => problem.label);
	check(
		"read: the dropped sort is reported beside the prop, not only warned",
		labels.join() === 'the sort by "colour"',
		JSON.stringify(labels),
	);
}

async function checkPagedFilterRefused(check: Check): Promise<void> {
	const mapped = mapCollection(folderOf("folder:paged"), { needs: WANTING });
	const refusal = await askQuery(mapped, { limit: 2, where: RED_ONLY });
	check(
		"read: a paged read with a condition on an unanswered need is refused too, never widened",
		refusal instanceof UnansweredFilterError && refusal.fields.join() === "colour",
		String(refusal),
	);
}

async function checkPageWithoutItemsRefused(check: Check): Promise<void> {
	const notPaged = collectionGateway<unknown>({
		id: "folder:not-paged",
		handlers: { list: () => ({ rows: [], total: 0 }), query: () => ({ rows: [] }) },
	});
	const parsed = parseReadsBy(notPaged, createProblems().contextFor("t1/pages", z.looseObject({})), "collection");
	check(
		"read: a paged read answered without items is refused, not passed on as a page",
		(await askQuery(parsed, {})) instanceof Error,
	);
}

function folderOf(id: string) {
	return collectionGateway<unknown>({
		id,
		handlers: {
			list: (query: Query | undefined) => applyQuery([], query),
			query: () => ({ items: [], next: null, total: 0 }),
			describe: () => fieldsOf(NOTES),
		},
	});
}

async function askQuery(gateway: object, input: object): Promise<unknown> {
	const query: unknown = Reflect.get(gateway, "query");
	if (typeof query !== "function") return "no query";
	return Promise.resolve(Reflect.apply(query, gateway, [input])).then(
		() => "answered",
		(failure: unknown) => failure,
	);
}
