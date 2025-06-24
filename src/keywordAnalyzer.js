// src/keywordAnalyzer.js
import { loadDynamicConfig } from './dynamicConfig.js';

let dyn;
function normalize(s) {
  return s.replace(/[‘’]/g,"'")
          .replace(/—/g,"-")
          .replace(/\u00A0/g," ")
          .replace(/,/g,"")
          .replace(/\s+/g," ")
          .trim();
}
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

export async function initParser() {
  const cfg = await loadDynamicConfig();
  dyn = {
    nameTriggers:        cfg.nameTriggers.map(normalize),
    sourcePhrases:       cfg.sourcePhrases.map(normalize),
    sources:             cfg.sources.map(normalize),
    leadSummaryRegexes:  cfg.leadSummaryTriggers.map(normalize)
                            .map(phr=>new RegExp('\\b'+esc(phr.toLowerCase())+'\\b','i')),
    productTypes:        cfg.productTypes.map(pt=>({
                            type:pt.type,
                            keywords:pt.keywords.map(normalize)
                          })),
    statusRules:         cfg.statusRules,
    // we no longer do numeric thresholds in parseMessage
    remarkTriggers:      cfg.remarkTriggers.map(normalize)
  };
}

// Returns true if this line matches any LeadSummary trigger
export function isSummary(raw) {
  if (!dyn) throw new Error('Parser not initialized');
  const low = normalize(raw).toLowerCase();
  return dyn.leadSummaryRegexes.some(rx => rx.test(low));
}

// Extracts product types from any line
export function extractTypes(raw) {
  if (!dyn) throw new Error('Parser not initialized');
  const low = normalize(raw).toLowerCase();
  const found = [];
  for (const {type,keywords} of dyn.productTypes) {
    for (const kw of keywords) {
      if (new RegExp('\\b'+esc(kw.toLowerCase())+'\\b','i').test(low)) {
        found.push(type);
        break;
      }
    }
  }
  return [...new Set(found)];
}

// Parses name, source, status, remarks from a combined summary+product line
export function parseMessage(raw) {
  if (!dyn) throw new Error('Parser not initialized');
  const clean = normalize(raw);
  const lower = clean.toLowerCase();

  // Require a summary phrase
  if (!dyn.leadSummaryRegexes.some(rx => rx.test(lower))) {
    return { name:null, source:null, type:[], status:'in progress', remarks:'' };
  }

  const out = { name:null, source:null, type:[], status:'in progress', remarks:'' };

  // Name
  for (const phr of dyn.nameTriggers) {
    const m = new RegExp(esc(phr)+'\\s*([^\\.]+)\\.','i').exec(clean);
    if (m) { out.name = m[1].trim(); break; }
  }

  // Source
  for (const phr of dyn.sourcePhrases) {
    const m = new RegExp(esc(phr)+'\\s*([^\\.,!?]+)','i').exec(clean);
    if (m) {
      const cand = m[1].trim().toLowerCase();
      const found = dyn.sources.find(s=>s.toLowerCase()===cand);
      if (found) { out.source = found; break; }
    }
  }
  if (!out.source) {
    for (const s of dyn.sources) {
      if (new RegExp('\\b'+esc(s.toLowerCase())+'\\b','i').test(lower)) {
        out.source = s; break;
      }
    }
  }

  // Types
  out.type = extractTypes(raw);

  // Status by pattern
  for (const {status,pattern} of dyn.statusRules) {
    if (new RegExp(pattern,'i').test(raw)) {
      out.status = status;
      break;
    }
  }

  // Remarks
  for (const phr of dyn.remarkTriggers) {
    const m = new RegExp(esc(phr)+'\\s*([^\\.]+)\\.','i').exec(clean);
    if (m) { out.remarks = m[1].trim(); break; }
  }

  return out;
}
