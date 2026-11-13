/*
 * Cradle Ceremony RSVP backend
 *
 * SETUP:
 * 1. Create a Google Sheet and copy its spreadsheet ID from its URL.
 * 2. In Extensions > Apps Script, paste this entire file.
 * 3. Set SPREADSHEET_ID below.
 * 4. Run setup() once and authorize the script.
 * 5. Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 6. Copy the /exec URL into config.js on your GitHub Pages site.
 *
 * The sheet itself should remain private. The public web app only accepts
 * submissions and updates; it does not expose a list or dashboard API.
 */

const SPREADSHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
const RSVP_SHEET_NAME = "RSVP Responses";
const DASHBOARD_SHEET_NAME = "Dashboard";
const HEADERS = ["Submitted At", "RSVP ID", "Name", "Phone", "Vegetarian", "Non-vegetarian", "Total", "Message"];

function setup() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes("PASTE_YOUR")) {
    throw new Error("Set SPREADSHEET_ID before running setup().");
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let data = ss.getSheetByName(RSVP_SHEET_NAME);
  if (!data) data = ss.insertSheet(RSVP_SHEET_NAME);
  data.clear();
  data.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  data.setFrozenRows(1);
  data.getRange(1, 1, 1, HEADERS.length)
    .setBackground("#6d251f").setFontColor("#ffffff").setFontWeight("bold");
  data.setColumnWidths(1, 8, 150);
  data.setColumnWidth(8, 280);
  data.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm");
  data.getRange("D:D").setNumberFormat("@");

  let dashboard = ss.getSheetByName(DASHBOARD_SHEET_NAME);
  if (!dashboard) dashboard = ss.insertSheet(DASHBOARD_SHEET_NAME);
  dashboard.clear();
  dashboard.getRange("A1:B1").merge().setValue("CRADLE CEREMONY — RSVP SUMMARY")
    .setBackground("#6d251f").setFontColor("#ffffff").setFontWeight("bold").setFontSize(14);
  dashboard.getRange("A3:A7").setValues([
    ["Confirmed RSVP submissions"], ["Vegetarian guests"], ["Non-vegetarian guests"],
    ["Total guests"], ["Last updated"]
  ]);
  dashboard.getRange("B3").setFormula(`=COUNTA('${RSVP_SHEET_NAME}'!B2:B)`);
  dashboard.getRange("B4").setFormula(`=SUM('${RSVP_SHEET_NAME}'!E2:E)`);
  dashboard.getRange("B5").setFormula(`=SUM('${RSVP_SHEET_NAME}'!F2:F)`);
  dashboard.getRange("B6").setFormula("=B4+B5");
  dashboard.getRange("B7").setFormula("=NOW()");
  dashboard.getRange("A3:A7").setFontWeight("bold");
  dashboard.getRange("B3:B6").setFontSize(16).setFontWeight("bold").setFontColor("#6d251f");
  dashboard.setColumnWidth(1, 240);
  dashboard.setColumnWidth(2, 180);
  dashboard.getRange("A9").setValue("Guest details are stored in the private RSVP Responses tab.");
  dashboard.getRange("A9").setFontColor("#777777");
  SpreadsheetApp.flush();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const params = (e && e.parameter) ? e.parameter : {};
    const action = String(params.action || "").toLowerCase();
    const rsvpId = String(params.rsvpId || "").trim().toUpperCase();
    const phone = normalizePhone_(params.phone || "");
    const name = String(params.name || "").trim().slice(0, 80);
    const veg = parseCount_(params.veg);
    const nonveg = parseCount_(params.nonveg);
    const notes = String(params.notes || "").trim().slice(0, 500);

    if (!["submit", "update"].includes(action)) return output_({ok:false, message:"Invalid action"});
    if (!/^CRADLE-[A-Z2-9]{6}$/.test(rsvpId)) return output_({ok:false, message:"Invalid RSVP ID"});
    if (phone.length < 7 || phone.length > 15) return output_({ok:false, message:"Invalid phone"});
    if (!Number.isInteger(veg) || !Number.isInteger(nonveg) || veg < 0 || nonveg < 0 ||
        veg > 500 || nonveg > 500 || veg + nonveg < 1) {
      return output_({ok:false, message:"Invalid guest counts"});
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(RSVP_SHEET_NAME);
    if (!sheet) throw new Error("Run setup() first.");

    if (action === "submit") {
      if (!name) return output_({ok:false, message:"Name is required"});
      const lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        const ids = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
        if (ids.includes(rsvpId)) return output_({ok:false, message:"Duplicate RSVP ID"});
      }
      sheet.appendRow([new Date(), rsvpId, name, phone, veg, nonveg, veg + nonveg, notes]);
      return output_({ok:true, action:"submit", rsvpId:rsvpId});
    }

    // Updates require both the unique RSVP ID and the original phone number.
    const last = sheet.getLastRow();
    if (last < 2) return output_({ok:false, message:"RSVP not found"});
    const rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
    for (let i = 0; i < rows.length; i++) {
      const rowId = String(rows[i][1] || "").toUpperCase();
      const rowPhone = normalizePhone_(rows[i][3]);
      if (rowId === rsvpId && rowPhone === phone) {
        const rowNumber = i + 2;
        sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([[
          new Date(), rsvpId, name || rows[i][2], phone, veg, nonveg, veg + nonveg, notes
        ]]);
        return output_({ok:true, action:"update", rsvpId:rsvpId});
      }
    }
    return output_({ok:false, message:"RSVP ID and phone number did not match"});
  } catch (err) {
    return output_({ok:false, message:String(err)});
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function parseCount_(value) {
  if (value === undefined || value === null || String(value).trim() === "") return NaN;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
}

function normalizePhone_(value) {
  return String(value || "").replace(/\D/g, "");
}

function output_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
