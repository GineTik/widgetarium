# The spec

A spec is what the person agrees to before anything is built. It lives at `Design/<app>/spec.md`,
one per app, and `node {tool} spec <app>` checks it and shows it in the chat as a card: the
features with a check each, your choices as pickers, Details, and Build it / Change. The person
answers on the card, so write it for them, not for you.

## When to write one

**Big change: write or update the spec, run `spec`, and stop until the person answers.** The card
is the answer: after `spec`, say one line ("Here is what I would build; answer on the card") and
nothing else. A spec repeated in the chat is the same thing twice, and the person reads neither.

- a new app or a new page
- a new kind of record
- a new feature, or one taken away

**Small change: no spec, go straight to the build.** Moving, restyling, renaming, showing a field
that already exists, fixing something broken.

Coming back to an app that has a spec: read it, change only what was asked, mark each new feature
`mark: new` and each changed one `mark: changed`, clear the marks the person already saw, and run
`spec` again. Ask nothing new.

## The front matter

The card reads only the front matter, so everything the person decides is there. `spec` refuses a
spec that does not fit and says which field.

```yaml
---
app: Vocabulary
job: Keep the words you meet, and review each one before you forget it.
features:
  - title: Catch a word in one line
    says: Type the word and its meaning at the top of Words
  - title: Today's review
    says: Due words one card at a time, knew it or not yet
  - title: Words come back when they should
    says: Known words wait longer, missed ones return tomorrow
  - title: Find and fix a word
    says: Search, open one, change or delete it
choices:
  - name: Review
    picked: Spaced
    options:
      - Spaced
      - Every word, every day
  - name: Example sentence
    picked: Optional
    options:
      - Optional
      - Required
      - None
pages:
  - name: Words
    body: list-detail
    says: The list, and the word you pick beside it
  - name: Review
    body: focus
    says: One card fills the page
excluded: [Decks, sharing, audio, progress charts]
checks:
  - A word typed in Words and Enter puts it in the list
  - Review shows only today's words, and the count drops
  - Deleting a word asks first
---
```

- **A feature is what the person can do and what they get**, in their words: "Catch a word in one
  line", never "Word: create". At most seven, each with a title of its own. `kept: false` is the
  person's answer, never yours; a feature they left out is not built.
- **A choice is what you could not guess**: at most three, each with a name of its own, your pick
  and the options. Write the options as a list, one per line: in `[a, b]` a comma inside an option
  splits it in two. The person changes it on the card; you build what `picked` says.
- **A page** names its body (`flow`, `dashboard`, `list-detail`, `collection`, `conversation`,
  `focus`) and what it is for.
- **`checks`** are the acceptance checks you walk on the drawn board before you say done.
- `widget` on a feature is written at stage 4: the widget and the page that carry it
  ("Flashcard, on Review"). The build card shows it.

## Below the front matter: the actions, for you

The person never sees this part. For every kind of record, what each list allows, so the build
knows where rows are added and where not:

```markdown
## Actions

| Word    | yes / no | where                 | notes                           |
| ------- | -------- | --------------------- | ------------------------------- |
| list    | yes      | Words · list          | sorted by next review           |
| add     | yes      | inline row at the top | word, meaning; example optional |
| edit    | yes      | Words · detail        | every field                     |
| delete  | yes      | the word's menu       | asks to confirm                 |
| reorder | no       |                       | the sort decides                |
| review  | yes      | Review · content      | knew it / not yet               |
```

A "no" is a decision: nothing on the board may offer it, and no binding's `allow` holds its verb.

## After the yes

The person presses Build it (the next message says "Build it"), or unticks features first. Read
the spec again, build only what is kept, and say each stage as you finish it:

```bash
node {tool} stage Vocabulary data --said "Words and reviews, 54 notes to try it with"
node {tool} stage Vocabulary design --said "Words beside the open word, Review as one card"
node {tool} stage Vocabulary widgets --said "3 ready, Flashcard written"
node {tool} stage Vocabulary pages --said "Words, Review"
```

Each call fills one row of the build card the person is watching. A stage you skip stays empty
there, and they see it.
