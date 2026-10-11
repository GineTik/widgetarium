# Notifications

Five ways to tell the person something. Pick by when it happened and how long it matters.

| Way                    | For                                                                              | Looks like                                                                            | Goes away                                   |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Toast**              | the result of the person's own action ("Saved", "Moved to Done", with Undo)      | a small ink panel at the bottom, page-coloured text, one action                       | by itself after 4–6s                        |
| **Bell in the header** | things that happened while the person was away: mentions, assignments, replies   | a bell with a dot; a panel of rows opens under it, newest first, unread in full ink   | read by opening, cleared by "Mark all read" |
| **Inline banner**      | a fact about this page right now: a sync failed, a trial ends, data is stale     | a line of text in a tone wash at the top of the page content, one action on the right | when the cause is fixed, or dismissed       |
| **Sidebar notice**     | one standing message for the whole product: an update, a tip, a sponsor (ref 14) | a mark, a title and one line at the bottom of the sidebar, no plate                   | dismissed, or replaced                      |
| **Badge**              | how many things wait in a place                                                  | a count after the place's word, ink-3, a pen pill when it waits on the person         | when the items are handled                  |

- A toast never carries something the person must read later; that is the bell.
- One banner per page at most; two banners means one of them is a toast or a bell row.
- Errors from the person's own action are toasts that say what failed and how to fix it.
- Kit: `toast()` and `Toaster`, `Popover` for the bell panel, `Alert tone` for the banner, `Badge` for counts.
