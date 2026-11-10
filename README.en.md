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
  plainly. It won't write any part of your thesis for you. You can continue a question
  with "Follow up", and keep using the other tabs while you wait for an answer.
- Questions about a passage of your thesis. Select a paragraph in the document and click
  "Attach the selected passage of your thesis". You can ask about it directly, or leave
  the question empty. Then the assistant checks what in the passage your sources support,
  what they don't cover and what they contradict. It never rewrites or corrects the passage.
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
- The title page from your university stays safe. Typography and formatting skip
  everything before the first page break (you can turn this off in the "Check" tab).
- The "Enlarge" button in the footer opens the toolkit in a large floating window. The
  Google Docs sidebar has a fixed width, so the window is handier for longer sessions.
  The window and the sidebar work separately: threads from one don't show up in the other.
- "Send feedback" in the footer. Write what isn't working or what's missing, click "Send"
  and the message goes straight to the author. No GitHub account needed.
- Settings in the sidebar: sources folder, Gemini key, model choice and a connection test.
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
- bibliography checks, including adding entries by DOI or ISBN,
- spotting passages copied too closely from sources,
- consistent terminology, figure and table numbering, editorial notes,
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

The toolkit checks for a newer version on its own. When there is one, a dot appears on the
settings icon (⚙), and the Updates section shows what's new and an "Update" button. The button
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
   "Test connection".
5. In the Sources tab, click "Process sources".

The processed texts go into a `PDZ – dane` subfolder inside your sources folder. That
subfolder is not treated as a source. If you remove a file from your sources, its text
goes to the trash the next time you process. If you change a source file, the add-on
marks it for processing again.

## Good to know

**Free Gemini can be slow.** The newest models and aliases like `gemini-flash-latest`
in particular can take a long time to answer or return an overload error. It's better
to pick a specific model version from the list. You can check your request limits in
AI Studio.

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
- `Feedback.js`: sends feedback from the sidebar to the relay service (`feedback/`).
- `Typography.js`: typography rules on plain text. No Google calls.
- `Check.js`: the "Check" tab. Goes through the text of the document and the footnotes,
  lists the places and applies fixes. Every fix first checks that the text there hasn't
  changed.
- `Format.js`: formatting requirements (stored in the document properties) and checks of
  paragraphs, titles, margins and page size.
- `FormatImport.js`: "Read from sources" – picks the passages about formatting from your
  sources and asks Gemini to fill in the requirements (JSON), with conflicts and quotes.
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
