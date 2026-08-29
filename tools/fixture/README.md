# The vault these tests run against

Four suites — adapter, board, dialog, interact — used to read the author's own vault. Three times
a suite went red because a person had used the app: a deadline set through the dialog, a task
added, and finally the whole demo set replaced with real work. Every time, the code was fine.

So the notes live here. They are the shape the app expects, they never move unless somebody moves
them on purpose, and `WG_VAULT` still points a run at a real vault when that is what is wanted.

`.widgetarium/widgets/@orbitask` is a link to the repo's own widgets, the way a real vault holds
them — the registry reads from the vault root, so notes and widgets have to share one.

`render-test` is the exception and still reads the author's vault on purpose: it proves the notes
a person actually has name widgets that are actually installed, and half of those live only there.
