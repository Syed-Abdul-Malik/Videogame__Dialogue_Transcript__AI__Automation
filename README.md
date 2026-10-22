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
