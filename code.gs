/**
 * --- VERY IMPORTANT: SET YOUR NAUGHTY WORDS HERE ---
 *
 * Add all the words you want to search for in this list.
 * The script is case-insensitive.
 */
const NAUGHTY_WORDS_TO_FIND = [ // UPDATED variable name
  'ass', 'asshole', 'badass', 'arse', 'arsehole', 'butt', 'arris',
  'fek', 'fuck', 'fook', 'freak', 'motherfucker', 'mf',
  'shit', 'poo', 'poop', 'excrement', 'crap', 'turd', 'shitheads',
  'bitch', 'bastard', 'n-word', 'nigga', 'nigger',
  'dick', 'cock', 'penis',
  'pussy', 'vagina', 'cunt', 'cunny', 'minge',
  'alcohol', 'liquor', 'bar',
  'champagne', 'hot toddy', 'cognac', 'rum', 'drink types', 'drink names',
  'beer', 'wine', 'cold one',
  'drink', 'drank', 'drunk',
  'tipsy', 'smashed', 'hammered', 'lit', 'toasted', 'wasted',
  'cigar', 'cigarette', 'tobacco',
  'smoke',
  'drug', 'pill', 'medication', 'medicate', 'nyquil',
  'cocaine', 'acid', 'pot', 'marijuana', 'weed', 'trees', 'ecstasy', 'heroin', 'mushroom', 'za', 'zaza', 'ganja', 'dope', 'crack', 'crank', 'perc(s)', 'percced up', 'fent', 'spliff', 'doobie', 'blunt', 'hashish', 'hash', 'meth', 'molly', 'mandy',
  'piss', 'urine', 'leak', 'pee', 'tinkle',
  'flatuence', 'fart',
  'whore', 'hoe', 'ho', 'slut', 'skank',
  'pansy', 'panzee', 'sissy', 'sissies',
  'idiot', 'stupid', 'dumb', 'moron', 'dummy', 'jerk', 'idiots',
  'sod', 'wanker', 'bloody',
  'damn', 'god damn',
  'hell', 'helluva',
  'sack', 'balls', 'nuts',
  'sex', 'sexy', 'sexier', 'sexiest',
  'fag', 'homo', 'fairy', 'gay', 'queer',
  'kill', 'murder', 'death', 'die', 'dead', 'dying', 'bleed', 'blood', 'murk', 'merk',
  'twat',
  'breast', 'tit', 'boob', 'boobies', 'splib',
  'slot machine', 'pea', 'zombie wars'
];

/** --- NEW: Define the output folder name --- */
const OUTPUT_FOLDER_NAME = "Malik's NWS Automation output";

/**
 * Serves the web page (index.html) when the user visits the URL.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Naughty Word Search Automation');
}

/**
 * This function is called from the frontend.
 * It receives the uploaded file, processes it, and returns the URL and ID of the new sheet.
 *
 * @param {object} fileObject - A simple object from the frontend { data: base64Data, type: mimeType, name: fileName }
 * @returns {object} An object { url: string, sheetId: string } or an error string.
 */
function processUploadedFile(fileObject) {
  let newSheetId = null;
  let outputFolderId = null; // <-- NEW
  try {
    // --- NEW: Get or create the output folder first ---
    outputFolderId = getOrCreateFolderId(OUTPUT_FOLDER_NAME);

    // 1. Decode the file data and create a 'Blob'
    const { type, name } = fileObject; // <-- Get common properties

    // --- NEW: Handle 3 paths: GSheet URL, .gsheet file, or Excel/other file ---
    
    if (type === 'application/vnd.google-apps.spreadsheet') {
      // --- Path 1: It's a GSheet URL. Just copy it. ---
      try {
        let sheetId = fileObject.url; // Get URL from fileObject
        if (sheetId.includes('/')) {
          sheetId = SpreadsheetApp.openByUrl(sheetId).getId();
        }
        const originalSheet = SpreadsheetApp.openById(sheetId);
        const newSheet = originalSheet.copy(`[Processed] ${originalSheet.getName()}`);
        newSheetId = newSheet.getId();

        // Move the copied file to the correct folder
        const file = DriveApp.getFileById(newSheetId);
        const outputFolder = DriveApp.getFolderById(outputFolderId);
        file.moveTo(outputFolder);

      } catch (e) {
        throw new Error(`Invalid Google Sheet URL. Could not open or copy: ${e.message}`);
      }

    } else if (type === 'application/vnd.google-apps.shortcut') {
      // --- Path 2: It's a .gsheet shortcut file. Get ID, then copy. ---
      try {
        // 'fileObject.data' is the JSON string from the .gsheet file
        const gsheetData = JSON.parse(fileObject.data);
        const sheetId = gsheetData.doc_id;
        if (!sheetId) {
          throw new Error("Invalid .gsheet file: 'doc_id' not found.");
        }
        const originalSheet = SpreadsheetApp.openById(sheetId);
        const newSheet = originalSheet.copy(`[Processed] ${originalSheet.getName()}`);
        newSheetId = newSheet.getId();
        
        // Move the copied file to the correct folder
        const file = DriveApp.getFileById(newSheetId);
        const outputFolder = DriveApp.getFolderById(outputFolderId);
        file.moveTo(outputFolder);
        
      } catch (e) {
        throw new Error(`Failed to process .gsheet file: ${e.message}`);
      }
      
    } else {
      // --- Path 3: It's an Excel, CSV, etc. file. Upload and CONVERT. ---
      const data = fileObject.data; // Get byte array
      // --- OPTIMIZATION 2: Use raw bytes directly ---
      // This skips the slow Utilities.base64Decode() step.
      const blob = Utilities.newBlob(data, type, name);

      // 2. Upload the file to Google Drive and *force* conversion to a Google Sheet.
      const driveFile = Drive.Files.insert(
        { 
          title: `[Processed] ${name}`,
          parents: [{ id: outputFolderId }] // <-- MODIFIED: Add parents property
        }, // New file name
        blob,
        { convert: true } // This forces conversion to a Google Sheet
      );
      newSheetId = driveFile.id;
    }
    
    if (!newSheetId) {
      throw new Error("Could not create a new sheet from the uploaded file.");
    }
    
    // --- OPTIMIZATION 3: "Smart Wait" Polling ---
    // Replaces the "dumb" 5-second sleep with a poll that checks
    // every second, succeeding as soon as the file is ready.
    const sheet = openSheetWithRetry(newSheetId, 15); // Try for 15 seconds max
    
    // 3. Run the analysis on the newly created Google Sheet
    let analysisResult;
    try {
      // Pass the already-opened sheet object to avoid opening it again
      analysisResult = runKeywordAnalysis(sheet);
    } catch (analysisError) {
      // If analysis fails, delete the new sheet to avoid clutter
      DriveApp.getFileById(newSheetId).setTrashed(true);
      throw new Error(`File was created, but analysis failed. The file may be empty or in an unsupported format. Details: ${analysisError.message}`);
    }


    if (analysisResult.success) {
      // 4. Return the URL and ID of the new sheet
      // --- UPDATED: Return object instead of string ---
      return {
        url: SpreadsheetApp.openById(newSheetId).getUrl(),
        sheetId: newSheetId
      };
    } else {
      // This will be caught by the outer try...catch
      throw new Error(analysisResult.error || "Unknown analysis error.");
    }

  } catch (e) {
    Logger.log(e);
    // If we created a sheet but failed *before* analysis, trash it.
    if (newSheetId) {
      try {
        DriveApp.getFileById(newSheetId).setTrashed(true);
      } catch (trashError) {
        Logger.log(`Failed to trash incomplete file: ${trashError.message}`);
      }
    }
    // Return a user-friendly error message
    return `ERROR: ${e.message}`;
  }
}

/**
 * --- NEW HELPER FUNCTION (OPTIMIZATION 3) ---
 * Tries to open a sheet, retrying if it fails (e.g., during conversion).
 * @param {string} spreadsheetId The ID of the sheet to open.
 * @param {number} maxRetries The maximum number of times to retry.
 * @param {number} delay The delay in milliseconds between retries.
 * @returns {Spreadsheet} The opened Spreadsheet object.
 */
function openSheetWithRetry(spreadsheetId, maxRetries = 10, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // If this succeeds, we return the sheet immediately
      const sheet = SpreadsheetApp.openById(spreadsheetId);
      return sheet;
    } catch (e) {
      Logger.log(`File not ready (Attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
      Utilities.sleep(delay);
    }
  }
  // If we exit the loop, it failed all retries
  throw new Error(`Failed to open spreadsheet with ID ${spreadsheetId} after ${maxRetries} attempts.`);
}


/**
 * --- NEW HELPER FUNCTION ---
 * Gets a folder by name, creating it if it doesn't exist.
 * @param {string} folderName The name of the folder to find or create.
 * @returns {string} The ID of the found or created folder.
 */
function getOrCreateFolderId(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    // Folder exists, return its ID
    const folder = folders.next();
    return folder.getId();
  } else {
    // Folder doesn't exist, create it and return its ID
    const newFolder = DriveApp.createFolder(folderName);
    return newFolder.getId();
  }
}


/**
 * This is YOUR script's logic, adapted to run on a specific Sheet ID.
 *
 * @param {Spreadsheet} sheet - The Spreadsheet object to process (already opened).
 * @returns {object} An object indicating success or failure.
 */
function runKeywordAnalysis(sheet) { // <-- Receives the sheet object
  try {
    const firstSheet = sheet.getSheets()[0]; // Use 'firstSheet' to avoid name collision

    // --- OPTIMIZATION START ---
    // Get the range from A1 down to the last row with content
    const lastRow = firstSheet.getLastRow();
    
    if (lastRow < 2) {
      // Sheet is empty or only has a header row, nothing to process
      // Set headers just in case
      firstSheet.getRange("B1").setValue("Keyword Found?");
      firstSheet.getRange("C1").setValue("Summary");
      firstSheet.getRange("A1:C1").setFontWeight("bold");
      return { success: true }; 
    }

    // --- LOGIC FIX: Get data from A2 (row 2) to skip the header ---
    const range = firstSheet.getRange("A2:A" + lastRow);
    const data = range.getValues();
    // --- OPTIMIZATION END ---
    
    const results = [];
    
    // Get the latest keywords from properties
    const currentKeywords = getNaughtyWords(); // UPDATED function call
    if (currentKeywords.length === 0) {
      // No keywords defined, so nothing to do.
      return { success: true };
    }

    // --- OPTIMIZATION 4: Single Giant Regex ---
    // Instead of looping 100 times for 100 keywords, we build one
    // regex that looks for "word1|word2|word3|..." all at once.
    // This changes the logic from O(rows * keywords) to O(rows * 1).
    const escapedKeywords = currentKeywords.map(k => escapeRegExp(k));
    const giantRegex = new RegExp("\\b(" + escapedKeywords.join("|") + ")\\b", "gi");

    // Loop through every cell in Column A (starting from row 2)
    for (let i = 0; i < data.length; i++) {
      const cellContent = data[i][0].toString();
      if (cellContent === "") {
        // If cell is empty, push empty results
        results.push(["", ""]);
        continue;
      }

      // --- OPTIMIZATION 4 (continued): Run one .match() per cell ---
      const matches = cellContent.match(giantRegex);
      
      let columnB_Output = "No";
      let columnC_Output = "";

      if (matches) {
        columnB_Output = "Yes";
        const foundSummary = {};
        
        // Count the found matches
        matches.forEach(match => {
          const lowerMatch = match.toLowerCase();
          foundSummary[lowerMatch] = (foundSummary[lowerMatch] || 0) + 1;
        });
        
        // Format the summary
        columnC_Output = Object.entries(foundSummary)
          .map(([word, count]) => `${word} x ${count}`)
          .join(", ");
      }

      results.push([columnB_Output, columnC_Output]);
    }

    // 4. Write all the results to the sheet at once (very fast)
    // --- LOGIC FIX: Start writing at row 2, column 2 (Cell B2) ---
    firstSheet.getRange(2, 2, results.length, 2).setValues(results);

    // Add headers (now they won't be overwritten)
    firstSheet.getRange("B1").setValue("Keyword Found?");
    firstSheet.getRange("C1").setValue("Summary");
    firstSheet.getRange("A1:C1").setFontWeight("bold");
    
    // --- OPTIMIZATION 5: Remove slow column resizing ---
    // firstSheet.autoResizeColumns(1, 3); // <-- REMOVED. This is slow.

    return { success: true };

  } catch (e) {
    Logger.log(e);
    return { success: false, error: e.message };
  }
}

/**
 * --- NEW HELPER FUNCTION for Regex ---
 * Escapes special regex characters from a string.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeRegExp(str) {
  // $& means the whole matched string
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// --- NAUGHTY WORD MANAGEMENT FUNCTIONS ---

const NAUGHTY_WORDS_PROPERTY_KEY = 'NAUGHTY_WORDS'; // UPDATED variable name

/**
 * Retrieves the current list of keywords from script properties.
 * @returns {string[]} An array of keywords.
 */
function getNaughtyWords() { // UPDATED function name
  const properties = PropertiesService.getScriptProperties();
  const keywordsString = properties.getProperty(NAUGHTCSS_WORDS_PROPERTY_KEY); // UPDATED
  if (keywordsString) {
    try {
      return JSON.parse(keywordsString);
    } catch (e) {
      Logger.log(`Failed to parse naughty words JSON: ${e.message}. Reverting to default.`);
      // If JSON is corrupt, reset to default
      properties.setProperty(NAUGHTY_WORDS_PROPERTY_KEY, JSON.stringify(NAUGHTY_WORDS_TO_FIND)); // UPDATED
      return NAUGHTY_WORDS_TO_FIND; // UPDATED
    }
  } else {
    // If no keywords are set, initialize with the default list
    properties.setProperty(NAUGHTY_WORDS_PROPERTY_KEY, JSON.stringify(NAUGHTY_WORDS_TO_FIND)); // UPDATED
    return NAUGHTY_WORDS_TO_FIND; // UPDATED
  }
}

/**
 * Adds a new keyword to the list.
 * @param {string} keyword - The keyword to add.
 * @returns {string[]} The updated array of keywords.
 */
function addNaughtyWord(keyword) { // UPDATED function name
  if (!keyword || keyword.trim() === "") {
    throw new Error("Naughty word cannot be empty."); // UPDATED error message
  }
  const lowerKeyword = keyword.toLowerCase().trim();
  let keywords = getNaughtyWords(); // UPDATED function call
  if (!keywords.includes(lowerKeyword)) {
    keywords.push(lowerKeyword);
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(NAUGHTY_WORDS_PROPERTY_KEY, JSON.stringify(keywords)); // UPDATED
  }
  return keywords;
}

/**
 * Deletes a keyword from the list.
 * @param {string} keyword - The keyword to delete.
 * @returns {string[]} The updated array of keywords.
 */
function deleteNaughtyWord(keyword) { // UPDATED function name
  const lowerKeyword = keyword.toLowerCase().trim();
  let keywords = getNaughtyWords(); // UPDATED function call
  const index = keywords.indexOf(lowerKeyword);
  if (index > -1) {
    keywords.splice(index, 1);
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(NAUGHTY_WORDS_PROPERTY_KEY, JSON.stringify(keywords)); // UPDATED
  }
  return keywords;
}
