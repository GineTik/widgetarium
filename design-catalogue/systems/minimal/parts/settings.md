# Settings

How settings are laid out and saved.

## Layout

| Size                                               | Layout                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A few settings                                     | one reading-width page of sections                                                       |
| Many groups (profile, team, billing, integrations) | a list of groups on the left (in-page navigation) and the open group's page on the right |
| Settings of one item                               | a tab "Settings" on the item's page, or a sheet                                          |

Each section: its title and one line of what it does on the left (a third of the width), its controls on the right. A line divides sections; no cards around them.

## Saving

| Control                                      | Saves                                                               |
| -------------------------------------------- | ------------------------------------------------------------------- |
| a switch, a select, a single choice          | at once, with a toast "Saved" and Undo                              |
| text fields, a form of several fields        | with a save bar at the bottom while something changed (`footer.md`) |
| something dangerous: delete, transfer, reset | in a confirm dialog that names what will happen                     |

- Dangerous actions live in their own section at the end, titled plainly ("Delete workspace"), with an outlined danger button.
- A setting that cannot be changed says why, in ink-3 under the control.
