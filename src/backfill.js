// src/backfill.js
import { initParser, isSummary, extractTypes, parseMessage } from './keywordAnalyzer.js';
import { upsertLead, loadSheetCache }                         from './sheets.js';
import { getLastRunTimestamp, saveLastRunTimestamp }          from './timestampStore.js';
import winston                                                from 'winston';

const logger = winston.createLogger({ transports:[new winston.transports.Console()] });
const sleep  = ms=> new Promise(r=>setTimeout(r,ms));

export async function backfillMissedLeads(client) {
  const lastRun    = await getLastRunTimestamp();
  const lastRunIso = new Date(lastRun*1000).toISOString();
  logger.info(`🔍 Backfill starting from ${lastRunIso}`);

  await initParser();
  await loadSheetCache();

  const chats = await client.getChats();
  logger.info(`💬 Scanning ${chats.length} one-on-one chats`);

  for (const chat of chats) {
    if (chat.isGroup) continue;

    // collect all outgoing msgs > cutoff
    let before = null;
    const outgoing = [];
    while (true) {
      const batch = await chat.fetchMessages({ limit:100, before });
      if (!batch.length) break;
      batch.forEach(m=>{
        if (m.fromMe && m.timestamp > lastRun) outgoing.push(m);
      });
      if (batch[batch.length-1].timestamp <= lastRun) break;
      before = batch[batch.length-1].id._serialized;
      await sleep(200);
    }

    if (!outgoing.length) {
      logger.info(`   ⚠️ Chat ${chat.id._serialized} no new outgoing msgs, skipping`);
      continue;
    }

    // oldest→newest
    outgoing.sort((a,b)=>a.timestamp - b.timestamp);
    logger.info(`➡️ Processing ${outgoing.length} msgs in chat ${chat.id._serialized}`);

    let activeSummary = null;

    for (const msg of outgoing) {
      const body  = msg.body || '';
      const tsIso = new Date(msg.timestamp*1000).toISOString();

      // summary?
      if (!activeSummary && isSummary(body)) {
        activeSummary = body.trim();
        logger.info(`   📝 [${tsIso}] Summary: "${activeSummary}"`);
        continue;
      }

      // if we have a summary, look for product line
      if (activeSummary) {
        const types = extractTypes(body);
        if (types.length) {
          const combined = `${activeSummary}\n${body}`;
          const parsed   = parseMessage(combined);

          parsed.type    = types;
          parsed.remarks = activeSummary;

          const record = {
            date:    tsIso.split('T')[0],
            contact: msg.to.split('@')[0],
            ...parsed
          };

          logger.info(`   👍 [${tsIso}] Upserting lead`, record);
          await upsertLead(record);
          logger.info(`   📤 Lead upserted`);

          activeSummary = null;
        }
        await sleep(300);
      }
    }

    logger.info(`🔚 Done chat ${chat.id._serialized}`);
  }

  const now = Math.floor(Date.now()/1000);
  await saveLastRunTimestamp(now);
  logger.info(`🔖 Saved new lastRun: ${new Date(now*1000).toISOString()}`);
}
