/**
 * PRC Pakistan — Course CMS
 * --------------------------
 * Google Apps Script backend for the PRIVATE "Courses" Google Sheet.
 *
 * The sheet stays private. This script runs as the sheet OWNER and
 * exposes a read-only GET endpoint that returns ONLY the course data
 * the public website needs. No credentials, no edit permissions and
 * no sheet ID are ever sent to the browser.
 *
 * DEPLOYMENT (one time, ~2 minutes):
 *   1. Open your spreadsheet in Google Sheets.
 *   2. Extensions > Apps Script (a tab opens).
 *   3. Delete any default "myFunction", paste this whole file, Ctrl+S.
 *   4. Deploy > New deployment.
 *   5. Gear icon > "Web app", description "Course CMS".
 *   6. Execute as: "Me"
 *      - who has access: "Anyone"
 *        (anyone can call the GET endpoint; they only see the JSON we
 *         return below, never the sheet or your Google account)
 *   7. Click Deploy, authorise the script (it only needs access to
 *      THIS spreadsheet), then copy the /exec web app URL.
 *   8. Paste that URL into course-cms.js  ->  COURSES_API_URL
 *
 * COACH WORKSFLOW:
 *   Coaches keep editing the Google Sheet directly. The site reads it
 *   live — no redeploys needed. New/edit/delete rows show up next time
 *   a visitor loads the page.
 *
 * SHEET COLUMNS (header row, order does not matter):
 *   id        - number, keep unique per course
 *   title     - course name
 *   category  - e.g. Workshop, Webinar, Seminar
 *   coach     - coach / facilitator name (shown on the card)
 *   location  - venue or "Online" (optional)
 *   description - one or two lines shown on the card
 *   date      - session date. TYPE IT AS A DATE in the sheet so it
 *               shows cleanly; the script converts it to YYYY-MM-DD.
 *   time      - e.g. "7:00 PM PKT" (plain text is safest)
 *   duration  - e.g. "2 hours"
 *   fee       - e.g. "Free" or "Rs. 2,500"
 *   mode      - Online / In-Person
 *   status    - "Open" to accept registrations. Anything containing
 *               closed/inactive/full/sold out/completed hides it.
 *   feature1, feature2, feature3 - three bullet points (optional)
 *   image     - a PUBLIC image URL. Imgur links work: paste the share
 *               link (imgur.com/XXXX) or the direct i.imgur.com/XXXX
 *               link. Leave empty to use the default course image.
 *   whatsapp  - number the Register button messages, digits only
 *
 * DATES: if a cell contains a date/time, Apps Script gets it back as a
 * Date object, which JSON.stringify turns into "2026-08-13T19:00:00.000Z".
 * The script below converts those to friendly text (YYYY-MM-DD, or
 * YYYY-MM-DD HH:MM when a time is stored in the cell).
 */

/**
 * GET /exec  ->  { ok, count, courses: [...] }
 */
function doGet(e) {
  return coursePayload();
}

function coursePayload() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Courses') || ss.getSheets()[0];

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // Empty sheet (only headers or nothing) -> empty course list.
    if (lastRow < 2) {
      return jsonOut({ ok: true, count: 0, courses: [] });
    }

    // Header row = column names ("id","title",...).
    const headers = sheet
      .getRange(1, 1, 1, lastCol)
      .getValues()[0]
      .map(function (h) { return String(h).trim(); });

    const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const courses = [];

    for (var i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip fully empty rows safely.
      const isEmpty = row.every(function (cell) {
        return String(cell).trim() === '';
      });
      if (isEmpty) continue;

      // Build one object per row using the header names as keys.
      const obj = {};
      for (var j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (!key) continue; // ignore extra/unnamed columns

        let val = row[j];
        // Date cells arrive as Date objects; JSON.stringify would turn
        // them into "2026-08-13T19:00:00.000Z", so format them nicely.
        if (val instanceof Date) {
          const f = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
          val = f.endsWith('00:00:00') ? f.slice(0, 10) : f.slice(0, 16);
        }
        obj[key] = val;
      }
      courses.push(obj);
    }

    return jsonOut({ ok: true, count: courses.length, courses: courses });
  } catch (err) {
    // Never leak internals; the frontend shows its own fallback text.
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}