// src/sheets.js
import { google } from 'googleapis';
import config      from './config.js';

let svc   = null;
let cache = [];   // { contact, __rowNum }

/**
 * Load the Leads sheet into cache.
 */
export async function loadSheetCache() {
  if (!svc) {
    const auth = new google.auth.JWT(
      config.serviceAccount.email,
      null,
      config.serviceAccount.privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    svc = google.sheets({ version:'v4', auth });
  }

  const res = await svc.spreadsheets.values.get({
    spreadsheetId: config.leadsSheetId,
    range: 'Leads!A1:G'
  });

  const rows = res.data.values || [];
  // Skip header, map contact from column C (index 2)
  cache = rows.slice(1).map((r,i) => ({
    contact:  r[2] || '',
    __rowNum: i + 2
  }));
}

/**
 * Upsert a lead, keyed by contact.
 * Columns: [Date, Name, Contact, Source, Type, Status, Remarks]
 */
export async function upsertLead(record) {
  const existing = cache.find(r => r.contact === record.contact);

  const row = [
    record.date,                   // A
    record.name    || '',          // B
    record.contact || '',          // C
    record.source  || '',          // D
    Array.isArray(record.type)
      ? record.type.join('; ')
      : (record.type || ''),       // E
    record.status  || '',          // F
    record.remarks || ''           // G
  ];

  if (existing) {
    // Update row __rowNum
    const range = `Leads!A${existing.__rowNum}:G${existing.__rowNum}`;
    await svc.spreadsheets.values.update({
      spreadsheetId: config.leadsSheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values: [row] }
    });
  } else {
    // Append new row
    await svc.spreadsheets.values.append({
      spreadsheetId: config.leadsSheetId,
      range: 'Leads!A1:G1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] }
    });
    cache.push({ contact: record.contact, __rowNum: cache.length + 2 });
  }
}
