import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	TypographyBlockquote,
	TypographyH3,
	TypographyInlineCode,
	TypographyLead,
	TypographyMuted,
	TypographyP,
} from "../../index";

export function Type(): ReactElement {
	return (
		<div>
			<TypographyH3>The joke tax</TypographyH3>
			<TypographyLead>A modal dialog that interrupts the user with important content.</TypographyLead>
			<TypographyP>
				The king thought long and hard, and finally came up with{" "}
				<TypographyInlineCode>a brilliant plan</TypographyInlineCode>.
			</TypographyP>
			<TypographyBlockquote>“After all,” he said, “everyone enjoys a good joke.”</TypographyBlockquote>
			<TypographyMuted>Enter your email address.</TypographyMuted>
		</div>
	);
}
