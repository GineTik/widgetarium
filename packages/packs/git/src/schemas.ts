import { z } from "zod";

export const CommitSchema = z.object({
	sha: z.string(),
	subject: z.string(),
	author: z.string(),
	at: z.string(),
	parents: z.array(z.string()),
	files: z.number().optional(),
	added: z.number().optional(),
	removed: z.number().optional(),
});

export const BranchSchema = z.object({
	name: z.string(),
	isCurrent: z.boolean(),
	isRemote: z.boolean(),
	upstream: z.string().nullable(),
	ahead: z.number(),
	behind: z.number(),
	head: z.string(),
});

export const FileChangeSchema = z.object({
	filePath: z.string(),
	change: z.enum(["added", "modified", "deleted", "renamed"]),
	from: z.string().optional(),
	added: z.number(),
	removed: z.number(),
	isStaged: z.boolean().optional(),
});

export const TagSchema = z.object({
	name: z.string(),
	sha: z.string(),
	at: z.string().nullable(),
});

export const WorktreeSchema = z.object({
	path: z.string(),
	branch: z.string().nullable(),
	head: z.string(),
	isMain: z.boolean(),
	isLocked: z.boolean(),
	isPrunable: z.boolean(),
	changed: z.number().optional(),
});

export const RepositoryFieldsSchema = z.object({ repository: z.string().optional() });

export type Commit = z.infer<typeof CommitSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type FileChange = z.infer<typeof FileChangeSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Worktree = z.infer<typeof WorktreeSchema>;
export type RepositoryFields = z.infer<typeof RepositoryFieldsSchema>;
