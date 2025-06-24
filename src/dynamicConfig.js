// src/dynamicConfig.js
import { google } from 'googleapis';
import config from './config.js';

let cache = null;

export async function loadDynamicConfig() {
  if (cache) return cache;

  const auth   = new google.auth.JWT(
    config.serviceAccount.email,
    null,
    config.serviceAccount.privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId   = config.configSheetId;

  async function fetch(range) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: ssId, range });
    return res.data.values || [];
  }

  const nameTriggers        = (await fetch('NameTriggers!A2:A')).flat().map(r=>r.trim());
  const sourcePhrases       = (await fetch('LeadSourceTriggers!A2:A')).flat().map(r=>r.trim());
  const sources             = (await fetch('Sources!A2:A')).flat().map(r=>r.trim());
  const leadSummaryTriggers = (await fetch('LeadSummaryTriggers!A2:A')).flat().map(r=>r.trim());

  const prodRows = await fetch('ProductTypes!A2:B');
  const productTypes = prodRows.map(([type, kws]) => ({
    type:     (type||'').trim(),
    keywords: (kws||'').split(';').map(s=>s.trim()).filter(Boolean)
  }));

  const statusRows = await fetch('StatusRules!A2:B');
  const statusRules = statusRows.flatMap(([st, pats]) =>
    (pats||'').split(';').map(p=>p.trim()).filter(Boolean)
      .map(pattern=>({ status: (st||'').trim(), pattern }))
  );

  const thresholdRows = await fetch('StatusThresholds!A2:B');
  const statusThresholds = thresholdRows.map(([st, num]) => ({
    status:    (st||'').trim(),
    threshold: Number(num)
  }));

  const remarkTriggers = (await fetch('RemarkTriggers!A2:A')).flat().map(r=>r.trim());

  cache = {
    nameTriggers,
    sourcePhrases,
    sources,
    leadSummaryTriggers,
    productTypes,
    statusRules,
    statusThresholds,
    remarkTriggers
  };
  return cache;
}
