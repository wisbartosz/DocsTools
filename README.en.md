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

- an assistant that answers questions based only on your sources and names the file,
- an AI usage log, handy for the AI disclosure statement many universities ask for,
- source cards with a summary and the key points,
- checking whether selected claims are backed by your sources,
- search across your sources,
- formatting checks and Polish typography (non-breaking spaces, quotation marks, dashes),
- bibliography checks, including adding entries by DOI or ISBN,
- spotting passages copied too closely from sources,
- consistent terminology, figure and table numbering, editorial notes,
- questions your supervisor might ask, and comparing your goals with your conclusions,
- a progress counter and a way to send feedback about the add-on,
- simpler installation: a ready document you copy with one click, updates from the
  sidebar, and an install script for Windows and macOS.

One rule applies throughout: the add-on never changes your text on its own. It shows you
what to fix, and it only applies formatting fixes when you click.

## Installation

The add-on's code is attached to a specific document. Every document you want to use it
in gets its own copy. There are two ways to put it there.

### With clasp (easier)

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

### Manually

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
3. In the Settings tab, paste the link to your sources folder.
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
- `TextClean.js`: text cleanup and page detection. No Google calls, so you can run and
  check it locally in Node.
- `Sidebar.html`, `Styles.html`, `Client.html`: the sidebar.

Text from PDFs and Word files is produced by converting a copy of the file to a Google
Doc (with Polish text recognition) and exporting it as plain text. The copy is deleted
right away. Each source is processed in a separate call, because Apps Script limits a
single call to about 6 minutes.

Whenever you change the text cleanup, bump `TEXT_PIPELINE_VERSION` in `TextClean.js`.
The add-on will then mark sources for processing again.
