# The spec

A spec is what the person agrees to before anything is built. It lives at `.widgetarium/apps/<app>/spec.md`,
one per app, and `node {tool} spec <app>` checks it and shows it in the chat as a card: the
features with a check each, your choices as pickers, Details, and Build it / Change. The person
answers on the card, so write it for them, not for you.

## When to write one

**Big change: write or update the spec, run `spec`, and stop until the person answers.** The card
is the answer: after `spec`, say one line ("Here is what I would build; answer on the card") and
nothing else. **Only after `spec` exits 0.** A refused spec draws the refusal in red where the card
should be: fix the field it names and run `spec` again. An older spec of the same app is not
exempt; it meets today's rules or the person gets no card. A spec repeated in the chat is the same thing twice, and the person reads neither.

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
research:
  - product: Anki
    takes: Cards come back on a schedule, and the count due today is the first thing you see
    url: https://apps.ankiweb.net
  - product: Noji
    takes: A Study button with its number, a deck split into not studied, learning and mastered, undo
    url: https://noji.io
features:
  - title: Catch a word
    says: Press Add word on Words, type the word and its meaning, Enter
    actions: [create]
  - title: Today's review
    says: Due words one card at a time, knew it or not yet
    actions: [update]
  - title: Words come back when they should
    says: Known words wait longer, missed ones return tomorrow
    actions: [update]
  - title: Find and fix a word
    says: Search, open one, change or delete it
    actions: [update, remove]
records:
  - name: Word
    can: [create, update, remove]
  - name: Review
    can: [create]
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
  line", never "Word: create". At most twelve, each with a title of its own. `kept: false` is the
  person's answer, never yours; a feature they left out is not built.
- **`research` is the products you looked at and what you take from each**, at least one, with
  `url` always: the page you read, or the product's own site when you worked from memory. The card
  shows each as a link the person opens to see what you mean; a reference without one is refused. `takes` is
  what you liked there, in one line. The card shows them as References with a tick each: a
  reference the person unticked (`kept: false`) is one you do not follow in the design. The card
  names them, and a feature the person did not ask for carries `mark: suggested`, kept by default:
  removing a feature is one press on the card, asking for a missing one is a whole new turn.
- **`actions` is what the feature writes**: `create`, `update`, `remove`, or `[]` when it only
  shows. Every feature names them; `report` refuses a feature whose page cannot do one of them —
  a review that cannot record an answer leaves the person stuck on the first card.
- **`records` is every kind of record the app keeps, and for each, whether it can be added, edited
  and deleted** (`can`, any of `create`, `update`, `remove`). Decide all three for every kind, out
  loud: the card draws Add, Edit and Delete beside each record and says "Cannot edit" for a verb
  you left out, so a person who never thought to ask about editing a book sees that it is missing
  and turns it on with one press. A kind of record with no feature to add it is a list nobody can
  fill: if `can` holds a verb, some kept feature's `actions` holds it too.
- **A choice is what you could not guess**: at most three, each with a name of its own, your pick
  and the options. Write the options as a list, one per line: in `[a, b]` a comma inside an option
  splits it in two. The person changes it on the card; you build what `picked` says.
- **A page** names its body (`flow`, `dashboard`, `list-detail`, `collection`, `conversation`,
  `focus`) and what it is for.
- **`checks`** are the acceptance checks you walk on the drawn board before you say done.
- `widget` and `page` on a feature are written at stage 4: the widget's id (`@you/flashcard`) and
  the name of the page that carries it. `note` on a page is written at stage 5: the page's vault
  path. `node {tool} report <app>` reads all three and says, per feature, whether it is built,
  checked and placed.

## Below the front matter: the actions, for you

The person never sees this part. `records` above says whether each verb exists; this says where it
stands, so the build knows where rows are added and where not:

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
node {tool} design Vocabulary
# here you stop, until the next message is "Approve design"
node {tool} stage Vocabulary design --said "Words beside the open word, Review as one card"
node {tool} stage Vocabulary catalogue --said "List and Record installed, Search was here"
node {tool} stage Vocabulary widgets --said "Flashcard written"
node {tool} stage Vocabulary pages --said "Words, Review"
```

Each call fills one row of the build card the person is watching. A stage you skip stays empty
there, and they see it.
