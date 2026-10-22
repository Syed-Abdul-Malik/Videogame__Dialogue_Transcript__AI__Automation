# Pertinent Line Detector (Transcript QA Automation)

A lightweight Google Apps Script (GAS) web application designed for high-efficiency transcript QA checks and content moderation.

This tool allows reviewers to upload transcripts in `.xlsx`, `.csv`, `.gsheet`, or direct Google Sheet formats. The backend engine evaluates every line in Column A against a designated list of pertinent/flagged keywords, computes occurrence summaries, and outputs an organized Google Sheet inside a dedicated Google Drive folder.

---

## Key Features

- **Multi-Format Processing**:
  - Direct Google Sheet URLs
  - `.gsheet` Google Drive shortcut files
  - Microsoft Excel (`.xlsx`) and CSV files (automatically converted to native Google Sheets via the Drive API)
- **High-Throughput Regex Matching**: Consolidates search terms into a single, case-insensitive regular expression with word boundary delimiters (`\b...\b`), shifting processing complexity from $O(\text{rows} \times \text{keywords})$ to $O(\text{rows})$.
- **Smart Wait Polling**: Uses an active polling loop (`openSheetWithRetry`) to verify file conversion completion before parsing data, avoiding race conditions.
- **Dynamic Property Persistence**: Keyword lists can be fetched, expanded, or pruned dynamically using Apps Script's `PropertiesService`.
- **Organized Destination Folders**: All processed outputs are routed into a shared output directory (`Malik's NWS Automation output`).

---

## Architecture Flow

```text

[User Browser]
       │
       ▼ (Submits .xlsx, .csv, .gsheet, or Sheet URL)
[Frontend: index.html]
       │
       ▼ (google.script.run.processUploadedFile)
[Backend: Code.gs]
       ├── Drive API v2: Converts raw byte stream to native Google Sheet
       ├── getOrCreateFolderId: Locates or initializes output directory
       ├── openSheetWithRetry: Confirms file conversion completion
       └── runKeywordAnalysis:
             ├── Compiles single regex from keyword list
             ├── Scans Column A (Rows 2..N)
             ├── Generates Match Flag (Col B) & Summary Count (Col C)
             └── Batch writes results in a single setValues() call
       │
       ▼
[Processed Google Sheet in Drive Folder]
       │
       ▼
[Returns Viewable Sheet URL to User]

asdas

```

Repository Structure

```
├── README.md        # Repository documentation and deployment instructions
├── Code.gs          # Google Apps Script backend engine
└── index.html       # Web application client UI interface
```

## Prerequisites

1. A Google Account with Google Drive access.

2. Access to [Google Apps Script](https://script.google.com).

3. Google Advanced Services enabled for **Drive API (v2)**.

---

## Setup & Deployment Instructions

### 1. Create the Apps Script Project

1. Open [Google Drive](https://drive.google.com) or [Google Apps Script](https://script.google.com).

2. Click **New Project** and name it `Pertinent-Line-Detector`.

### 2. Add Source Code

1. Open the default `Code.gs` file in the Apps Script editor.

2. Replace all placeholder contents with the code provided in `Code.gs`.

3. In the left editor menu, click the **+** icon next to **Files** and select **HTML**.

4. Name the file `index` (creating `index.html`) and paste your client UI code.

### 3. Enable the Drive API Service

Because uploaded Excel files are converted programmatically to native Google Sheets, you must enable the Drive service:

1. In the left sidebar, click the **+** icon next to **Services**.

2. Select **Drive API** from the list.

3. Select version **v2** and click **Add**.

### 4. Deploy as a Web App

1. In the top-right corner, click **Deploy** > **New deployment**.

2. Click the gear icon (**Select type**) and select **Web app**.

3. Configure the deployment settings:

   * **Description**: `Pertinent Line Detector - Production v1`

   * **Execute as**: `Me` *(Required so Drive folder creation operates under your permissions)*

   * **Who has access**: `Anyone within your organization` (or `Anyone` depending on team access requirements)

4. Click **Deploy** and grant the requested OAuth permissions.

5. Copy the generated **Web App URL** and share it with your team.

## Configuration & Wordlist Management

### Default Wordlist

The baseline dictionary is configured in `Code.gs` under `NAUGHTY_WORDS_TO_FIND`.

### Persistent Keyword Storage

The script caches active search terms in `PropertiesService.getScriptProperties()` under the key `NAUGHTY_WORDS`. You can manage words programmatically via:

* `getNaughtyWords()`: Returns the active dictionary array.

* `addNaughtyWord(word)`: Adds a new keyword to persistent storage.

* `deleteNaughtyWord(word)`: Removes a keyword from persistent storage.

### Output Folder

To change the output directory name, edit `OUTPUT_FOLDER_NAME` in `Code.gs`:

```
const OUTPUT_FOLDER_NAME = "Malik's NWS Automation output";

```


