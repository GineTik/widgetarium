import { z } from "zod";
import { gitCommand } from "./git-command.js";

const FileSchema = z.object({ filePath: z.string().min(1) });
const WorktreePathSchema = z.object({ path: z.string().min(1) });

export class StageCommand extends gitCommand(FileSchema, ({ filePath }) => ["add", "--", filePath]) {}

export class UnstageCommand extends gitCommand(FileSchema, ({ filePath }) => ["restore", "--staged", "--", filePath]) {}

export class CommitCommand extends gitCommand(z.object({ message: z.string().min(1) }), ({ message }) => [
	"commit",
	"-m",
	message,
]) {}

export class CheckoutCommand extends gitCommand(z.object({ branch: z.string().min(1) }), ({ branch }) => [
	"switch",
	branch,
]) {}

export class CreateBranchCommand extends gitCommand(
	z.object({ name: z.string().min(1), from: z.string().optional() }),
	({ name, from }) => ["switch", "-c", name, ...(from ? [from] : [])],
) {}

export class PullCommand extends gitCommand(z.undefined(), () => ["pull", "--ff-only"]) {}

const PUSH_ASKED = "Push the branch's commits to its upstream?";
const PUSH_DECLINED = "the push was not confirmed, so nothing was sent";

export class PushCommand extends gitCommand(z.undefined(), () => ["push"]) {
	override async run(sent: undefined): Promise<void> {
		if (!(await this.ports.confirm(PUSH_ASKED))) throw new Error(PUSH_DECLINED);
		await super.run(sent);
	}
}

export class WorktreeAddCommand extends gitCommand(
	z.object({ path: z.string().min(1), branch: z.string().optional(), newBranch: z.string().optional() }),
	({ path, branch, newBranch }) => [
		"worktree",
		"add",
		...(newBranch ? ["-b", newBranch] : []),
		path,
		...(branch ? [branch] : []),
	],
) {}

export class WorktreeRemoveCommand extends gitCommand(WorktreePathSchema, ({ path }) => ["worktree", "remove", path]) {}

export class WorktreeLockCommand extends gitCommand(WorktreePathSchema, ({ path }) => ["worktree", "lock", path]) {}

export class WorktreeUnlockCommand extends gitCommand(WorktreePathSchema, ({ path }) => ["worktree", "unlock", path]) {}
