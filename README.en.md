<p align="center"><img src="assets/logo.svg" width="160" alt="A frog in a graduation cap"></p>

# Przybornik dyplomowanej Żabki

[Polska wersja](README.md)

A Google Docs add-on that helps you write your thesis: it answers questions based on your sources
and checks your thesis against your university's requirements. It lives in the document's sidebar,
and in the menu it shows up simply as **PDZ**. The name is Polish and roughly means "the graduating
frog's toolkit".

It works with a regular, free Google account. AI features only need a free Gemini key from Google
AI Studio – you don't have to pay for Gemini or have Google Workspace.

**The toolkit doesn't write your thesis for you and never changes it on its own.** It shows you
what to fix; a fix is applied only when you click "Fix".

## Getting started

### A new document with the toolkit

Open this link and click "Make a copy":

https://docs.google.com/document/d/18DZXa969W9EE75X6z7C3ZNG1ieOqRtMOaDvdnFVoKc4/copy

The copy lands in your Drive with the toolkit already inside. A short note at the top of the
document tells you what to do next. Nothing to install on your computer.

### You already have a thesis document

Open the PDZ Installer, paste the link to your document and click "Install":

https://script.google.com/macros/s/AKfycbw46Frsvuuh_VpBv5G1iSk2KE_flxFaJ6ZClwq51BneFK9qAsxVmA8LBXYlfBNSNcfT/exec

The first time, the installer will ask you to turn on "Google Apps Script API" for your account
(https://script.google.com/home/usersettings). It's a single switch you set once.
On work and university accounts the administrator may block scripts like this.

### First run

1. PDZ → Open Przybornik dyplomowanej Żabki.
2. Google will ask for permission and warn you that the app isn't verified – it's your own script.
   Choose Advanced → Go to… and allow it.
3. In Settings (⚙ in the top right of the panel), paste the link to your sources folder in Drive
   (it can be the same folder you use in NotebookLM).
4. Paste the key from https://aistudio.google.com/apikey, choose a model and click "Check" next to
   "Connection".
5. In the Sources tab, click "Process sources".

Until these steps are done, the Assistant tab shows them one by one with a button for the next one.

The processed texts go into a `PDZ – dane` subfolder inside your sources folder (the subfolder
itself is not a source). A changed source file is processed again, and the text of a removed one
goes to the trash.

### Updates

The toolkit checks for a newer version on its own. When there is one, a "Version … is available"
bar appears at the top of the panel with an "Update" button that opens the installer. Your work,
settings and processed sources stay. If the new version gives you trouble, Settings (the Panel card,
"Version") has a link to the installer with a "Restore the previous version" button. Reload the
document after updating.

## What it can do

### Assistant with your sources

- **Questions about your sources.** The answer is based only on the sources you've ticked, with
  a verbatim quote and a page number (when known) for each source. The toolkit checks on its own
  that the quote really appears in the text; if the sources don't answer the question, it says so
  plainly. The conversation works like a chat, and "Copy with references" copies the answer with
  its sources.
- **Search in your sources.** A "From sources | Search" switch above the question box. Search works
  without AI: any word form (Polish inflections included), and "in quotes" for the exact phrase.
  Results show the passage and page, and "Show in source" opens the preview at that page.
- **Source preview.** "Show in source" next to a quote opens the PDF right at the page with the
  quote and highlights it. For other files (Word, Google Docs) it shows the source text with the
  quote highlighted.
- **Questions about a passage of your thesis.** Select a paragraph and click "Attach the selected
  passage of your thesis". With no question, the assistant shows what in the passage your sources
  support, what they don't cover and what they contradict. It never rewrites the passage.
- **Sources in many formats:** PDF (scans too), Word, ODT, RTF, Google Docs and plain text files.
  The text is tidied up (Word comments, dot leaders, repeated footers), and page numbers from the
  footers stay as markers for quotes.

### Checking your thesis (the "Check" tab)

"Check the whole thesis" runs all modules and shows an overview: how much is to fix and how much to
review. Click a remark to see the place in the document.

| Module | What it checks | Fix |
|---|---|---|
| Structure | table of contents, heading levels and chapter numbering, required parts and their order, keywords, length of the abstract and the aim, number of pages | chapter numbering, a title typed as plain text → heading |
| References and citations | Harvard citations with no entry and entries nothing cites, alphabetical order, how entries and citations are written, old sources and Wikipedia, quotes without a citation | citation style, sorting the references |
| Tables, figures and appendices | captions and their position, sources under tables, numbering, references in the text, the list of tables and figures | renumbering with a preview, caption above the table, a list with links |
| Style | the personal form, numbers in digits or words, tenses in the Introduction and Conclusion, announcements in the abstract | pointers only |
| Abbreviations | acronyms missing from the list of abbreviations, unused list entries, list order, the full name at first use | pointers only |
| Typography | one-letter words at the end of a line, „…” quotes, en dashes, ellipsis, extra spaces | one by one or "Fix all" |
| Formatting | font, size, line spacing, alignment, indent, margins, A4, chapter titles, captions, chapters on a new page | formatting and letter case of titles |

Remarks to review that are fine can be **ignored** (one by one or a whole group). A hidden remark
comes back by itself when you change the paragraph text, and "Restore all hidden remarks" undoes
everything. The university's **title page** is skipped – everything before the first page break
(you can turn this off).

### University requirements

The default formatting and structure requirements come from the guidelines of the university the
toolkit was made for. If yours is different, change them on the "University requirements" screen
or click "Read from sources" – Gemini fills them in from the guidelines among your sources, and you
check the result before saving. The requirements are saved in the document, so every thesis can
have its own.

### Convenience

- **"Enlarge"** in the footer opens the toolkit in a large floating window – handier than the
  narrow sidebar.
- **Polish and English interface**, picked from your Google account or in the settings.
- **"Send feedback"** in the footer sends a message straight to the author, no GitHub account needed.

## Good to know

**Free Gemini is often overloaded**, especially in the European evening and with the newest Flash
models. The toolkit then tries backup models on its own and says so next to the answer; when all
of them are overloaded, try again in a few minutes. Pick models from the "Recommended" group.
A paid plan with a spending limit in AI Studio costs a fraction of a cent per question and is
usually less overloaded.

**Your data on the free tier.** On the free tier Google may use the content you send to improve
its services. The toolkit reminds you about this the first time you use AI and only sends what
a given feature needs. Don't send confidential data.

**Page numbers** in quotes are only known when the file had repeated footers with numbers.
Otherwise (for example in Word files) the reference points to the file and section.

**Your API key** is stored in your Google account settings, not in the document – other people
with access to the document can't see it.

### Permissions

| Permission | What it's for |
|---|---|
| `documents.currentonly` | working with the current document only |
| `drive.readonly` | reading files from the sources folder |
| `drive.file` | saving the add-on's own files (source texts); no access to your other files |
| `script.external_request` | connecting to Gemini and fetching text from Drive |
| `script.container.ui` | the menu and the sidebar |

## What's planned

- an AI usage log, handy for the AI disclosure statement many universities ask for,
- source cards with a summary and the key points,
- a plain Gemini chat without sources, e.g. about the style of a selected passage,
- adding reference entries by DOI or ISBN,
- spotting passages copied too closely from sources,
- different names for the same concept and editorial notes (overlong sentences, repetition),
- questions your supervisor might ask, and comparing your goals with your conclusions,
- a progress counter.

## For developers

The code lives in `src` (Apps Script V8, files deliberately flat) and is attached to a document –
every document has its own copy.

**Putting it into a document.** `clasp push -f` with a `.clasp.json` file (template in
`.clasp.json.example`; script ID: Extensions → Apps Script → Project Settings). Requires
"Google Apps Script API" turned on at https://script.google.com/home/usersettings. When clasp is
blocked (work accounts): in the script editor recreate each file from `src` under the same name
without the extension and replace `appsscript.json` (Project Settings → "Show appsscript.json
manifest file"). Don't edit the code in the editor – the next push overwrites it.

**What isn't obvious from the code:**

- Every text the user sees is in `Messages.js` in both languages (`t_('key')`, in the sidebar
  `t('key')`).
- `Client*.html` is plain JavaScript without tags. `Sidebar.html` puts the files verbatim into one
  `<script>` with `includeScript_`, in its own order – a new file has to be added there.
- Modules get sources from `getReadySources_()`, not straight from the index.
- PDFs and Word files are converted to a Google Doc (with text recognition) and exported as text,
  each source in a separate call (Apps Script's limit is ~6 minutes). Changed the text cleanup?
  Bump `TEXT_PIPELINE_VERSION` in `TextClean.js` and sources will be processed again.

**The installer** (`installer/`) is a separate script published as a web app that runs as the
person who opens it. It has to be linked to its own Google Cloud project with the Apps Script API
enabled. It reads the version from `latest.json` on `main`, takes the code from the archive of the
tag named there (`src` only), and before replacing anything saves the current code as a
"PDZ backup" script version. If a broken version can't even open the sidebar, the installer also
works with `?scriptId=<script ID>`.

**The feedback relay** (`feedback/`) runs under the author's account and emails messages to that
same account. Your own copy of the toolkit needs its own relay: deploy it (access: anyone, including
anonymous; execute as: me), run `sendTestMessage` once in the editor, and put its URL in
`FEEDBACK_URL` in `src/Feedback.js`.

## Privacy and license

What the toolkit stores and sends is described in the [privacy policy](PRIVACY.md).

MIT, see [LICENSE](LICENSE).
