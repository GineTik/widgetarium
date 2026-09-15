# Wizard

A step-by-step process where the user enters information in a prescribed order, and later steps may
depend on what earlier ones produced.

## The shape it suits

A handful of steps, each holding a coherent group of fields. Steps are emphatically **not peers** —
they are ordered and dependent. The user does not choose among them; the system advances them.

The defining test is **dependency**. If step three's content does not depend on steps one and two,
you have a form with headings, not a wizard.

## Take it when

- The user is a novice, or the process is infrequent — "configuration or setup" is the archetype.
- Each step must be validated before the next can be computed.

## Leave it when

Nielsen Norman is unusually direct. Avoid a wizard when:

- users perform the task repeatedly — it "becomes tedious";
- interaction costs outweigh the benefit;
- **users need to compare information across steps** — the wizard hides exactly what they need;
- professional users need flexibility and control;
- "the process requires access to information blocked by modal windows";
- users require creative control over the workflow.

And the worst observed failure: multi-page forms that **erase entered data** when one field is
corrected — tested as "the most frustrating UX failure in multi-page forms".

## Regions

| Region | Rule |
| --- | --- |
| Step indicator | Required. "Communicate a clear mental model of the process by displaying a list or a diagram of the steps involved and highlighting the current step" |
| Step body | Self-sufficient — no step may require leaving the wizard for information |
| Help | "Help and explanations should appear in a window next to the wizard and should not cover the wizard" |
| Navigation | Next and previous labelled with step names, not "Next" alone. Order enforced: "do not allow users to pick step before completing the steps preceding it" |

State must survive exit: "allow users to exit the wizard midway and save state. Allow them to resume
the process at a later time."

## Width

The help rule has a layout consequence people miss: **the wizard must not occupy the full width** if
help is possible — reserve a companion region beside it.

The body obeys the measure: 40–60 characters, 80 as the ceiling. A wizard step spanning 1600px is a
defect.

## Costs

Slow for experts. Hides the whole. Forces a linear order onto data that may not have one. Requires
state persistence to be tolerable at all.

## Seen in

Checkout flows (commerce) · tax filing and KYC onboarding (finance) · OS and device setup (system
software) · cloud provisioning wizards (infrastructure) · course enrolment (education).

## Composition

Main region, width-capped, with a companion help region.

It must **not** be put in a modal if it has several steps or referenceable content, and not in a
drawer or a pane for the same reason. Never in a sidebar.

## In a board

Rare here, and usually wrong. A board is a persistent screen; a wizard is a transient task. If a
setup flow is genuinely needed, it belongs in a widget's own dialog, not in the board's layout.

The one legitimate board-level case: a screen that is empty until configured, where the
[empty-state](empty-state.md) carries the first step and the board fills in afterwards.
