import { NO_CATALOGUE_PORT } from "../packages/core/src/engine/catalogue-port.ts";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandLinePort, ImplementationPorts } from "../packages/core/src/engine/packs.ts";
import {
	BranchesQuery,
	CommitFilesQuery,
	CommitsQuery,
	CurrentBranchQuery,
	StatusQuery,
	TagsQuery,
	WorktreesQuery,
	gitPack,
} from "../packages/packs/git/src/index.ts";
import {
	CheckoutCommand,
	CommitCommand,
	CreateBranchCommand,
	StageCommand,
	WorktreeAddCommand,
	WorktreeRemoveCommand,
} from "../packages/packs/git/src/commands.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const commandLine: CommandLinePort = {
	can: true,
	run: (file, args, cwd) =>
		new Promise((settle) =>
			execFile(file, [...args], { cwd }, (failure, stdout, stderr) =>
				settle({ ok: !failure, output: `${stdout}${stderr}`, failure: failure ? failure.message : null }),
			),
		),
};

const root = mkdtempSync(join(tmpdir(), "wg-git-"));
const repository = join(root, "repo");
const ports: ImplementationPorts = {
	commandLine,
	workingDirectory: repository,
	self: "t1/git",
	catalogue: NO_CATALOGUE_PORT,
	network: { can: false, request: () => Promise.reject(new Error("no network")) },
	vault: {
		can: false,
		folder: () => {
			throw new Error("no vault");
		},
		notesTagged: async () => [],
		notesMatching: async () => [],
		open: () => {},
	},
	confirm: async () => true,
	refs: { read: async () => null, watch: () => () => {}, get: () => null, described: () => null },
};
const git = async (...args: string[]): Promise<string> => {
	const outcome = await commandLine.run("git", args, repository);
	if (!outcome.ok) throw new Error(outcome.output);
	return outcome.output;
};

try {
	await commandLine.run("git", ["init", "-b", "main", repository], root);
	await git("config", "user.email", "test@example.com");
	await git("config", "user.name", "Test Person");
	writeFileSync(join(repository, "a.txt"), "one\ntwo\n");
	await git("add", "a.txt");
	await git("commit", "-m", "First commit");
	writeFileSync(join(repository, "a.txt"), "one\ntwo\nthree\n");
	writeFileSync(join(repository, "b.txt"), "bee\n");
	await git("add", ".");
	await git("commit", "-m", "Second commit");
	await git("tag", "v1");

	const commits = await new CommitsQuery({}, ports).list();
	check(
		"commits are listed newest first with subject and author",
		commits.rows.map((row) => [row.subject, row.author]),
		[
			["Second commit", "Test Person"],
			["First commit", "Test Person"],
		],
	);
	check(
		"and carry their diff stat",
		[commits.rows[0]?.files, commits.rows[0]?.added, commits.rows[0]?.removed],
		[2, 2, undefined],
	);
	check("and the total", commits.total, 2);
	check("a commit's ref is its sha", commits.rows[0]?.ref, commits.rows[0]?.sha);
	check("the second commit has the first as parent", commits.rows[0]?.parents, [commits.rows[1]?.sha]);
	const paged = await new CommitsQuery({}, ports).list({ offset: 1, limit: 1 });
	check("a page skips and limits", [paged.rows.map((row) => row.subject), paged.total], [["First commit"], 2]);
	const byPath = await new CommitsQuery({ path: "b.txt" }, ports).list();
	check(
		"a path keeps only the commits touching it",
		byPath.rows.map((row) => row.subject),
		["Second commit"],
	);
	const filtered = await new CommitsQuery({}, ports).list({
		where: [{ prop: "subject", op: "contains", value: "First" }],
	});
	check(
		"a where on the subject greps",
		filtered.rows.map((row) => row.subject),
		["First commit"],
	);

	const files = await new CommitFilesQuery({ sha: commits.rows[0]?.sha ?? "" }, ports).list();
	check(
		"a commit's files carry their change and line counts",
		files.rows.map((row) => [row.filePath, row.change, row.added, row.removed]),
		[
			["a.txt", "modified", 1, 0],
			["b.txt", "added", 1, 0],
		],
	);

	check(
		"the tag is listed",
		(await new TagsQuery({}, ports).list()).rows.map((row) => row.name),
		["v1"],
	);

	await new CreateBranchCommand({}, ports).run({ name: "feature" });
	check("create-branch switches to the new branch", (await new CurrentBranchQuery({}, ports).get())?.name, "feature");
	check(
		"both branches are listed, the current one marked",
		(await new BranchesQuery({}, ports).list()).rows.map((row) => [row.name, row.isCurrent]),
		[
			["feature", true],
			["main", false],
		],
	);
	await new CheckoutCommand({}, ports).run({ branch: "main" });
	check("checkout switches back", (await new CurrentBranchQuery({}, ports).get())?.name, "main");

	writeFileSync(join(repository, "b.txt"), "bee\nsting\n");
	writeFileSync(join(repository, "c.txt"), "sea\n");
	check(
		"status lists the changed and the untracked file",
		(await new StatusQuery({}, ports).list()).rows.map((row) => [row.filePath, row.change, row.isStaged, row.added]),
		[
			["b.txt", "modified", false, 1],
			["c.txt", "added", false, 0],
		],
	);
	await new StageCommand({}, ports).run({ filePath: "c.txt" });
	check(
		"stage marks the file staged",
		(await new StatusQuery({}, ports).list()).rows.find((row) => row.filePath === "c.txt")?.isStaged,
		true,
	);
	await new CommitCommand({}, ports).run({ message: "Third commit" });
	check("commit writes what is staged", (await new CommitsQuery({}, ports).list()).rows[0]?.subject, "Third commit");

	const elsewhere = join(root, "elsewhere");
	await new WorktreeAddCommand({}, ports).run({ path: elsewhere, newBranch: "side" });
	const worktrees = (await new WorktreesQuery({}, ports).list()).rows;
	check(
		"worktrees list the main one first and the added one with its branch",
		worktrees.map((row) => [row.isMain, row.branch]),
		[
			[true, "main"],
			[false, "side"],
		],
	);
	check(
		"and count what each has uncommitted",
		worktrees.map((row) => row.changed),
		[1, 0],
	);
	writeFileSync(join(elsewhere, "dirty.txt"), "x\n");
	const refused = await new WorktreeRemoveCommand({}, ports).run({ path: elsewhere }).then(
		() => "removed",
		(failure: unknown) => (failure instanceof Error ? "refused" : "?"),
	);
	check("removing a worktree with uncommitted changes is refused by git", refused, "refused");

	const outside = await new CommitsQuery({}, ports).list({ where: [{ prop: "branch", op: "is", value: "x" }] }).then(
		() => "listed",
		(failure: unknown) => (failure instanceof Error ? failure.message : "?"),
	);
	check(
		"a where on a field git cannot filter is refused by name",
		outside,
		"@git/commits filters only by author and subject, not by branch",
	);

	const gone = await new CommitsQuery({ repository: join(root, "nowhere") }, ports).list().then(
		() => "listed",
		(failure: unknown) => (failure instanceof Error ? "failed" : "?"),
	);
	check("a repository that is not there fails with git's reason", gone, "failed");

	check(
		"the pack names every implementation under @git",
		[
			gitPack.queries.length,
			gitPack.commands.length,
			[...gitPack.queries, ...gitPack.commands].every((entry) => entry.id.startsWith("@git/")),
		],
		[7, 11, true],
	);
} finally {
	rmSync(root, { recursive: true, force: true });
}

console.log(`\n${failed === 0 ? "git pack: clean" : `git pack: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
