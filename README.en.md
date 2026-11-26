<p align="center"><img src="assets/logo.svg" width="160" alt="A frog in a graduation cap"></p>

# Przybornik dyplomowanej Żabki

[Polska wersja](README.md)

A Google Docs add-on that helps you write your thesis. It lives in the document's
sidebar and works with the sources you keep in a single Google Drive folder (the same
one you can use in NotebookLM).

The name is Polish and roughly means "the graduating frog's toolkit". In the document
menu the add-on shows up simply as **PDZ**.

It works with a regular, free Google account. AI features only need a free Gemini key
from Google AI Studio. You don't have to pay for Gemini or have Google Workspace.

## What works now

- The assistant. You ask a question and the answer is based only on the sources you've
  ticked. Every answer comes with a list of sources, each with a verbatim quote and a page
  number (where we know it). The add-on checks on its own whether the quote really appears
  in the source text. If the sources don't answer the question, the assistant says so
  plainly. It won't write any part of your thesis for you. The conversation works like a
  chat: the next question in the box at the bottom continues the open conversation, "New
  conversation" starts another one, and "Copy with references" copies the answer with its
  sources. You can keep using the other tabs while you wait for an answer.
  With long sources only the passages related to the question go to Gemini, and when the
  chosen model is overloaded, the toolkit switches to a backup model and says so next to the answer.
- Questions about a passage of your thesis. Select a paragraph in the document and click
  "Attach the selected passage of your thesis". You can ask about it directly, or leave
  the question empty. Then the assistant checks what in the passage your sources support,
  what they don't cover and what they contradict. It never rewrites or corrects the passage.
- The "Check" tab (first in the panel): the "Check the whole thesis" button runs all checks one
  after another and shows an overview – how much is to fix, how much to review and the state of
  each module. Clicking a module opens its results with "To fix / To review" filters. The type of
  thesis (review / research) is chosen at the top, and the university requirements have their own
  "University requirements" screen.
- Style in the "Check" tab: the personal form ("uważam", "moim zdaniem", "przeprowadziłam"),
  numbers up to 9 written in digits and from 10 in words, the past tense in sentences about the
  thesis in the Introduction and the future tense in the Conclusion, and announcements instead of
  content in the abstract. Pointers only, no changes to the text; quotes, citations in brackets,
  tables, the references and the annex are skipped.
- Polish typography in the "Check" tab. The add-on goes through the body of your thesis
  and the footnotes: one-letter words without a non-breaking space (a, i, o, u, w, z),
  straight quotes instead of „…”, hyphens instead of en dashes, three dots instead of an
  ellipsis, double spaces and spaces before commas or full stops. Click a passage to see
  it in the document. Fixes happen only when you click, one at a time or "Fix all" for
  a given kind.
- Formatting against your university's requirements, also in the "Check" tab. You enter
  the requirements (font, size, line spacing, alignment, indent, margins, A4, how chapter
  and section titles look, table and figure captions, chapters on a new page) and the
  add-on lists the paragraphs that differ. Fixes change only the formatting and the
  letter case of titles. The requirements are saved in the document, so every thesis can
  have its own. The "Read from sources" button fills in the requirements from the
  guidelines among your sources (via Gemini); you can check and adjust them before saving.
- Thesis structure, also in the "Check" tab: whether the automatic table of contents is up
  to date, heading levels, chapter numbering in order (with a one-click fix), required parts
  (Introduction, Conclusion, References…) in the right order, the number of keywords, the
  length of the abstract and the aim, and the number of pages. You enter the requirements
  once or read them from the guidelines among your sources (the same button as for the
  formatting requirements); they are saved in the document.
- References and citations, also in the "Check" tab. The add-on finds Harvard citations
  in the text – in brackets, e.g. (Kowalski 2019), and in the sentence, e.g. "according to
  Kowalski (2019)" – and the entries in the reference list. It shows citations with no
  entry, entries nothing in the text refers to, alphabetical order, the number of entries,
  how entries are written (initials, full stop after the year, "et al.", pages, access date
  for web pages), Wikipedia and sources older than 10 years. The "Sort references" button
  puts the entries in alphabetical order and keeps their formatting.
  It also checks how citations are written according to the guidelines (full stop after
  the bracket, "i in." for more than two authors, commas and semicolons, year letters a/b,
  number of authors matching the reference list) with a one-click fix, quotes without a
  citation and quotes in italics, and lists for review longer paragraphs without a
  citation in the theoretical part, citations in Results, and a Discussion built mostly
  on new works.
- Tables, figures and appendices, also in the "Check" tab. The add-on finds tables and images
  with their captions and shows: objects without a caption or with the caption below, without
  a source ("Źródło: …" / "Opracowanie własne"), web sources without an access date, numbering
  out of order (including "Tabela 2.1"), references in the text to numbers that do not exist,
  objects nothing refers to, mismatches with the list of tables and figures, and appendices
  without a "(Załącznik N)" reference. Tables and figures in the annex are skipped. The
  "Renumber…" button next to the numbering shows a preview ("Tabela 4 → 3") and fixes the
  numbers in captions, references in the text (footnotes and table cells too) and the list in
  one click. Ambiguous references are left as they are and listed for you to fix. "Move
  above" moves a caption from below a table or figure to above it (one or all at once), and
  "Create the list…" / "Refresh the list…" inserts the list of tables and figures after the
  references (or in place of the current one) with links to the captions and estimated page
  numbers – Docs does not give scripts page numbers, so check them before you submit.
- The default formatting and structure requirements come from the guidelines of the
  university the toolkit was made for. They apply right away, with nothing to save. If your
  university is different, change them in the forms or read them from your sources. The
  "Restore defaults" button fills the form with the values from the guidelines; they apply
  once you click "Save requirements", so an accidental click doesn't delete anything.
- The title page from your university stays safe. All checks skip
  everything before the first page break (you can turn this off in the "Check" tab).
- The "Enlarge" button in the footer opens the toolkit in a large floating window. The
  Google Docs sidebar has a fixed width, so the window is handier for longer sessions.
  In the window the tabs are in a menu on the left; in "Check" the module list sits next to
  the results, and in the assistant the conversations are in the menu and the quotes next to the answer.
  The window and the sidebar work separately: threads from one don't show up in the other.
- "Send feedback" in the footer. Write what isn't working or what's missing, click "Send"
  and the message goes straight to the author. No GitHub account needed.
- Settings in the sidebar: sources folder, Gemini key, model choice and a connection test.
  Changes are saved at once (the key with a button). A new language shows after you
  reopen the panel.
- Polish and English interface. The add-on picks the language of your Google account,
  and you can change it in the settings.
- Source processing. The add-on extracts text from PDFs (scans included), Word, ODT and
  RTF files, Google Docs and plain text files. Along the way it tidies the text up: it
  removes Word comments, form dot leaders and repeated footers. If the footers had page
  numbers, page markers stay in the text, so later it can point to where a passage came
  from.

## What's planned

The add-on doesn't write your thesis for you. It's meant to help you check it and work
with your sources.

- an AI usage log, handy for the AI disclosure statement many universities ask for,
- source cards with a summary and the key points,
- checking whether selected claims are backed by your sources,
- search across your sources,
- adding reference entries by DOI or ISBN,
- spotting passages copied too closely from sources,
- renumbering tables and figures with one click and generating the list of tables and figures,
- consistent terminology, editorial notes,
- questions your supervisor might ask, and comparing your goals with your conclusions,
- a progress counter.

One rule applies throughout: the add-on never changes your text on its own. It shows you
what to fix, and it only applies formatting fixes when you click.

## Installation

### The easy way: copy a ready document

Open this link and click "Make a copy":

https://docs.google.com/document/d/18DZXa969W9EE75X6z7C3ZNG1ieOqRtMOaDvdnFVoKc4/copy

The copy lands in your Drive with the toolkit already inside. A short note at the top of
the document tells you what to click next. Nothing to install on your computer.

### You already have a thesis document

Open the PDZ Installer, paste the link to your document and click "Install":

https://script.google.com/macros/s/AKfycbw46Frsvuuh_VpBv5G1iSk2KE_flxFaJ6ZClwq51BneFK9qAsxVmA8LBXYlfBNSNcfT/exec

The first time, the installer will ask you to turn on "Google Apps Script API" for your
account (https://script.google.com/home/usersettings). It's a single switch you set once.

### Updates

The toolkit checks for a newer version on its own. When there is one, a "Version … is available"
bar with an "Update" button appears at the top of the panel, a dot appears on the settings
icon (⚙), and Settings (the Panel card, "Version") shows what's new and an "Update" button. The button
opens the installer, which replaces the toolkit in your document with the latest version.
Your work, settings and processed sources stay. If the new version gives you trouble,
Settings has a link to the installer with a "Restore the previous version" button. Reload the document after updating.

On work and university accounts the administrator may block scripts like this.

### For developers

The add-on's code is attached to a specific document. Every document you want to use it
in gets its own copy. Below are two ways to put it into an existing document.

#### With clasp

clasp is a Google tool that copies files from this repository into the document's script
editor. It works the same on Windows and macOS. You need git and Node.js.

Once per computer:

1. Install Node.js (the LTS version).
   - Windows: the installer from https://nodejs.org
   - macOS: easiest with Homebrew, `brew install node`. The nodejs.org installer works
     too, but then `npm install -g` usually needs `sudo`.
2. Install git. On Windows: https://git-scm.com. On macOS, type `git` in Terminal and
   the system will offer to install the developer tools.
3. `npm install -g @google/clasp`
4. `clasp login` and sign in to the account that owns the document.
5. Turn on "Google Apps Script API" at https://script.google.com/home/usersettings

On work accounts the administrator may block clasp. In that case use the manual
installation.

Get the code into a folder of your choice:

```
git clone https://github.com/wisbartosz/DocsTools.git
cd DocsTools
```

For each document:

1. Open the document and choose Extensions → Apps Script.
2. In the editor open Project Settings (the gear icon) and copy the script ID.
3. Create a `.clasp.json` file based on `.clasp.json.example` and put the ID in it:
   - Windows (PowerShell): `copy .clasp.json.example .clasp.json`
   - macOS (Terminal): `cp .clasp.json.example .clasp.json`

   Then open `.clasp.json` in any text editor. On macOS, files starting with a dot are
   hidden in Finder; press Cmd + Shift + period to show them.
4. Run `clasp push -f`.
5. Reload the document. **PDZ** will appear in the menu.

To update, run `git pull` and then `clasp push -f` again. Don't edit the code by hand in
the script editor, because the next push will overwrite your changes.

#### Manually

1. Open the document and choose Extensions → Apps Script.
2. In Project Settings, tick "Show appsscript.json manifest file in editor".
3. Replace the contents of `appsscript.json` with `src/appsscript.json`.
4. For each `.js` file in `src`, create a script file with the same name (without the
   extension) and paste the contents. You can delete the default `Code.gs`.
5. Do the same with the `.html` files: `Sidebar`, `Styles` and `Client`.
6. Save and reload the document.

## First run

1. PDZ → Open Przybornik dyplomowanej Żabki.
2. Google will ask for permission. You'll see a warning that the app isn't verified,
   because it's your own script. Choose Advanced → Go to… and allow it.
3. In Settings (the ⚙ icon in the top right of the panel), paste the link to your sources folder.
4. Paste the key from https://aistudio.google.com/apikey, choose a model and click
   "Check" next to "Connection". The Assistant tab shows these steps one by one.
5. In the Sources tab, click "Process sources".

Until then, the Assistant tab shows these steps with progress and a button for the next one.

The processed texts go into a `PDZ – dane` subfolder inside your sources folder. That
subfolder is not treated as a source. If you remove a file from your sources, its text
goes to the trash the next time you process. If you change a source file, the add-on
marks it for processing again.

## Good to know

**Free Gemini is often overloaded.** On the free tier Google often turns requests down
because of heavy traffic, especially in the European evening and with the newest Flash
models. The toolkit then tries backup models on its own (Flash-Lite first, which is
usually the least busy), but when all of them are overloaded you have to try again in a
few minutes. Pick a model from the "Recommended" group. If overload gets in the way a lot,
you can turn on a paid plan with a spending limit in AI Studio: our requests cost a
fraction of a cent each, and overload is usually rarer on the paid plan. You can check
your request limits in AI Studio.

**Your data on the free tier.** On the free Gemini tier Google may use the content you
send to improve its services. The add-on reminds you about this the first time you use
AI and only sends what a given feature needs. Don't send confidential data.

**Page numbers.** The add-on only knows page numbers when the file had repeated footers
with numbers. Otherwise (for example in Word files) it refers to the file and section.

**Your API key** is stored in your Google account settings, not in the document. Other
people with access to the document can't see it.

### Permissions

| Permission | What it's for |
|---|---|
| `documents.currentonly` | working with the current document only |
| `drive.readonly` | reading files from the sources folder |
| `drive.file` | saving the add-on's own files (source texts); no access to your other files |
| `script.external_request` | connecting to Gemini and fetching text from Drive |
| `script.container.ui` | the menu and the sidebar |

## For developers

The code is in `src` and runs on Apps Script (V8). The files are deliberately flat, with
no subfolders, so the manual installation can recreate them.

- `Menu.js`: menu, sidebar, add-on name and version number.
- `Messages.js`: every text the user sees, in Polish and English. Add new texts in both
  languages and use them in code with `t_('key')` (in the sidebar with `t('key')`).
- `I18n.js`: language selection and filling in parameters in texts.
- `Config.js`: settings. The key and model belong to the user, the folder to the document.
- `Gemini.js`: Gemini connection, retries on 429/5xx errors, model list.
- `Store.js`: working files in the `PDZ – dane` folder. Deleting means moving to the trash.
- `Sources.js`: source list, processing, index and cleanup. Other modules should get
  sources from `getReadySources_()`, not straight from the index.
- `Assistant.js`: the assistant. Builds the Gemini request from the selected sources,
  receives the answer in a fixed format (JSON) and matches quotes to sources.
- `Quotes.js`: finding a quote in the source text (exactly or approximately) and working
  out the page from the markers. No Google calls.
- `Retrieval.js`: picks the passages of long sources that relate to the question (simple
  word ranking, no Google calls).
- `Feedback.js`: sends feedback from the sidebar to the relay service (`feedback/`).
- `Typography.js`: typography rules on plain text. No Google calls.
- `Style.js`: style – the personal form, how numbers are written, tenses in the Introduction and
  Conclusion, phrases in the abstract. One shared mask (quotes, citations, references, links) and
  pure functions testable in Node.
- `Check.js`: the "Check" tab. Goes through the text of the document and the footnotes,
  lists the places and applies fixes. Every fix first checks that the text there hasn't
  changed.
- `Format.js`: formatting requirements (stored in the document properties) and checks of
  paragraphs, titles, margins and page size.
- `FormatImport.js`: "Read from sources" – picks the passages about formatting from your
  sources and asks Gemini to fill in the requirements (JSON), with conflicts and quotes.
- `Structure.js`: thesis structure – table of contents, heading levels and numbering,
  required parts, keywords, lengths, page count (estimated from the layout, PDF export only near the minimum). The pure functions can be
  tested in Node.
- `Figures.js`: tables, figures and appendices – captions, sources, numbering, references
  in the text, list of tables and figures, renumbering (`renumberPlan_` – a pure function that
  plans the changes). The pure functions can be tested in Node.
- `Bibliography.js`: references and Harvard citations – finding citations and entries,
  matching, alphabetical order, sorting, citation style and placement with fixes. The pure functions can be tested in Node.
- `TextClean.js`: text cleanup and page detection. No Google calls, so you can run and
  check it locally in Node.
- `Sidebar.html`, `Styles.html`, `Client.html`: the sidebar.

Text from PDFs and Word files is produced by converting a copy of the file to a Google
Doc (with Polish text recognition) and exporting it as plain text. The copy is deleted
right away. Each source is processed in a separate call, because Apps Script limits a
single call to about 6 minutes.

Whenever you change the text cleanup, bump `TEXT_PIPELINE_VERSION` in `TextClean.js`.
The add-on will then mark sources for processing again.

The installer (`installer/`) is a separate Apps Script project published as a web app that
runs as the person who opens it. It has to be linked to its own Google Cloud project with
the Apps Script API enabled, because the hidden projects behind document scripts don't
allow code changes. It reads the latest version from `latest.json` on the `main` branch
and takes the code from the archive of the tag named there (the `src` folder only). Before
replacing anything it saves the current code as a "PDZ backup" script version, which the
restore button uses. If a broken version can't even open the sidebar, you can open the
installer by hand with `?scriptId=<the document's script ID>`.

Feedback from the sidebar goes to a separate small web app (`feedback/`). It runs under
the author's account and emails each message to that same account, so no address appears
in the code. It has an hourly message limit and trims fields that are too long. If you
maintain your own copy of the toolkit, deploy your own relay (access: anyone, including
anonymous; execute as: me), run `sendTestMessage` once in the editor to grant
permissions, and put its URL in `FEEDBACK_URL` in `src/Feedback.js`.

Releasing a new version: bump `APP_VERSION` in `src/Menu.js`, update `latest.json`
(version, tag, release notes in Polish and English), commit, tag `vX.Y.Z` and push both.

## Privacy and license

What the toolkit stores and sends is described in the [privacy policy](PRIVACY.md).

MIT, see [LICENSE](LICENSE).
