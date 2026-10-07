import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { Grid } from "../packages/kit/src/index";
import { Section, WideSection } from "./kit-demo-frame.tsx";
import {
	InputsBugReport,
	InputsCalendar,
	InputsChoices,
	InputsCombobox,
	InputsDatePickers,
	InputsFields,
} from "./kit-demo-inputs.tsx";
import { INPUTS_USAGE } from "./kit-demo-inputs-usage.ts";

export function InputsSections(): ReactElement {
	return (
		<Fragment>
			<Grid min={340}>
				<Section
					title="Calendar"
					note="captionLayout=dropdown · the month and year are kit Selects"
					usage={INPUTS_USAGE.calendar}
				>
					<InputsCalendar />
				</Section>
				<Section title="InputGroup · InputOTP · NativeSelect" usage={INPUTS_USAGE.fields}>
					<InputsFields />
				</Section>
				<Section title="RadioGroup · Slider · Toggle · ButtonGroup · Kbd" usage={INPUTS_USAGE.choices}>
					<InputsChoices />
				</Section>
				<Section title="Combobox" note="Popover + filtering, single and chips" usage={INPUTS_USAGE.combobox}>
					<InputsCombobox />
				</Section>
				<Section title="Forms" note="useForm + Controller over the Field anatomy" usage={INPUTS_USAGE.form}>
					<InputsBugReport />
				</Section>
			</Grid>
			<WideSection
				title="Date Picker"
				note="Popover + Calendar: single, range over two months"
				usage={INPUTS_USAGE.datePicker}
			>
				<InputsDatePickers />
			</WideSection>
		</Fragment>
	);
}
