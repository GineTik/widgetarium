import { Button, Icon, Popover, PopoverItem, PopoverSearch } from "widgetarium/kit";
import { useState } from "react";

const LANGUAGES = [
	"bash",
	"c",
	"cpp",
	"csharp",
	"css",
	"dart",
	"diff",
	"docker",
	"elixir",
	"erlang",
	"go",
	"graphql",
	"groovy",
	"haskell",
	"hcl",
	"html",
	"ini",
	"java",
	"javascript",
	"json",
	"jsx",
	"kotlin",
	"latex",
	"lua",
	"makefile",
	"markdown",
	"matlab",
	"nginx",
	"objectivec",
	"perl",
	"php",
	"powershell",
	"python",
	"r",
	"regex",
	"ruby",
	"rust",
	"scala",
	"scss",
	"sql",
	"swift",
	"text",
	"toml",
	"tsx",
	"typescript",
	"xml",
	"yaml",
	"zig",
];

export function LanguagePicker({ language, onPick }: { language: string; onPick: (next: string) => void }) {
	const [isOpen, setOpen] = useState(false);
	const choose = (next: string) => {
		setOpen(false);
		onPick(next);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			placement="below"
			trigger={
				<Button size="s" className="wgc-lang wg-kit-glass">
					{language || "plain"}
					<Icon name="chevron" size={12} className="wgc-caret" />
				</Button>
			}
		>
			<PopoverSearch placeholder="Find a language">
				{(needle: string) => [
					...LANGUAGES.filter((name) => name.includes(needle)).map((name) => (
						<PopoverItem key={name} checked={name === language} onClick={() => choose(name)}>
							{name}
						</PopoverItem>
					)),
					needle !== "" && !LANGUAGES.includes(needle) ? (
						<PopoverItem key="custom" onClick={() => choose(needle)}>
							<Icon name="plus" size={14} className="wgc-plus" />
							Use custom language
							<span className="wgc-needle">{needle}</span>
						</PopoverItem>
					) : null,
				]}
			</PopoverSearch>
		</Popover>
	);
}
