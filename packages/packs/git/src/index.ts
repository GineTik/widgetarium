import { definePack } from "@widgetarium/core/engine/packs.js";
import { defineCommandMetadata, defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import { BranchesFieldsSchema, BranchesQuery } from "./branches-query.js";
import { CommitFilesFieldsSchema, CommitFilesQuery } from "./commit-files-query.js";
import { CommitsFieldsSchema, CommitsQuery } from "./commits-query.js";
import {
	CheckoutCommand,
	CommitCommand,
	CreateBranchCommand,
	PullCommand,
	PushCommand,
	StageCommand,
	UnstageCommand,
	WorktreeAddCommand,
	WorktreeLockCommand,
	WorktreeRemoveCommand,
	WorktreeUnlockCommand,
} from "./commands.js";
import { CurrentBranchQuery } from "./current-branch-query.js";
import { RepositoryFieldsSchema } from "./schemas.js";
import { StatusQuery } from "./status-query.js";
import { TagsQuery } from "./tags-query.js";
import { WorktreesQuery } from "./worktrees-query.js";

export * from "./schemas.js";
export { BranchesQuery, CommitFilesQuery, CommitsQuery, CurrentBranchQuery, StatusQuery, TagsQuery, WorktreesQuery };

const fields = RepositoryFieldsSchema;

export const gitPack = definePack({
	id: "@git",
	title: "Git",
	queries: [
		defineGatewayMetadata(CommitsQuery, {
			id: "@git/commits",
			title: "Commits",
			resource: "Git",
			description: "The commits of a branch, newest first, optionally only those touching a path.",
			fields: CommitsFieldsSchema,
		}),
		defineGatewayMetadata(BranchesQuery, {
			id: "@git/branches",
			title: "Branches",
			resource: "Git",
			description: "Every local branch, with how far it is ahead of and behind its upstream.",
			fields: BranchesFieldsSchema,
		}),
		defineGatewayMetadata(CurrentBranchQuery, {
			id: "@git/current-branch",
			title: "Current branch",
			resource: "Git",
			description: "The branch checked out in the repository.",
			fields,
		}),
		defineGatewayMetadata(StatusQuery, {
			id: "@git/status",
			title: "Uncommitted changes",
			resource: "Git",
			description: "Every file changed in the working tree, staged or not.",
			fields,
		}),
		defineGatewayMetadata(CommitFilesQuery, {
			id: "@git/commit-files",
			title: "Files of a commit",
			resource: "Git",
			description: "The files one commit changed; the commit can be another widget's pick.",
			fields: CommitFilesFieldsSchema,
		}),
		defineGatewayMetadata(TagsQuery, {
			id: "@git/tags",
			title: "Tags",
			resource: "Git",
			description: "Every tag, newest first.",
			fields,
		}),
		defineGatewayMetadata(WorktreesQuery, {
			id: "@git/worktrees",
			title: "Worktrees",
			resource: "Git",
			description: "Every worktree of the repository, with how many files each has uncommitted.",
			fields,
		}),
	],
	commands: [
		defineCommandMetadata(StageCommand, {
			id: "@git/stage",
			title: "Stage a file",
			resource: "Git",
			description: "Adds a file's changes to the next commit.",
			fields,
		}),
		defineCommandMetadata(UnstageCommand, {
			id: "@git/unstage",
			title: "Unstage a file",
			resource: "Git",
			description: "Takes a file's changes out of the next commit and keeps them in the working tree.",
			fields,
		}),
		defineCommandMetadata(CommitCommand, {
			id: "@git/commit",
			title: "Commit",
			resource: "Git",
			description: "Commits what is staged with the message sent.",
			fields,
		}),
		defineCommandMetadata(CheckoutCommand, {
			id: "@git/checkout",
			title: "Switch branch",
			resource: "Git",
			description: "Switches the working tree to another branch.",
			fields,
		}),
		defineCommandMetadata(CreateBranchCommand, {
			id: "@git/create-branch",
			title: "Create a branch",
			resource: "Git",
			description: "Creates a branch and switches to it.",
			fields,
		}),
		defineCommandMetadata(PullCommand, {
			id: "@git/pull",
			title: "Pull",
			resource: "Git",
			description: "Brings in the upstream's commits when that needs no merge.",
			fields,
		}),
		defineCommandMetadata(PushCommand, {
			id: "@git/push",
			title: "Push",
			resource: "Git",
			description: "Sends the branch's commits to its upstream.",
			fields,
		}),
		defineCommandMetadata(WorktreeAddCommand, {
			id: "@git/worktree-add",
			title: "Add a worktree",
			resource: "Git",
			description: "Checks a branch out into a folder of its own.",
			fields,
		}),
		defineCommandMetadata(WorktreeRemoveCommand, {
			id: "@git/worktree-remove",
			title: "Remove a worktree",
			resource: "Git",
			description: "Removes a worktree; git refuses one with uncommitted changes.",
			fields,
		}),
		defineCommandMetadata(WorktreeLockCommand, {
			id: "@git/worktree-lock",
			title: "Lock a worktree",
			resource: "Git",
			description: "Keeps a worktree from being pruned or removed.",
			fields,
		}),
		defineCommandMetadata(WorktreeUnlockCommand, {
			id: "@git/worktree-unlock",
			title: "Unlock a worktree",
			resource: "Git",
			description: "Lets a locked worktree be pruned or removed again.",
			fields,
		}),
	],
});
