// src/index.js
import 'dotenv/config';
import express from 'express';
import pkg     from 'whatsapp-web.js';
import winston from 'winston';

import { initParser, parseMessage } from './keywordAnalyzer.js';
import { loadSheetCache, upsertLead } from './sheets.js';
import { backfillMissedLeads }        from './backfill.js';

const { Client, LocalAuth } = pkg;
const logger = winston.createLogger({ transports:[new winston.transports.Console()] });

async function start() {
  await initParser();
  await loadSheetCache();

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath:'./sessions' }),
    puppeteer:    { headless:true, args:['--no-sandbox','--disable-dev-shm-usage'] }
  });

  client.on('ready', async () => {
    logger.info('✅ WhatsApp client ready – running backfill');
    try {
      await backfillMissedLeads(client);
      logger.info('✅ Backfill complete');
    } catch (err) {
      logger.error('🚨 Backfill error:', err);
    }
  });

  client.on('message_create', async msg => {
    if (!msg.fromMe || msg.to.endsWith('@g.us')) return;
    const parsed = parseMessage(msg.body||'');
    if (!parsed.type.length) return;

    const record = {
      date:    new Date().toISOString().split('T')[0],
      contact: msg.to.split('@')[0],
      ...parsed
    };

    logger.info('✉️ [LIVE] Upserting lead', record);
    try {
      await upsertLead(record);
      logger.info('✔️ [LIVE] Lead upserted');
    } catch (err) {
      logger.error('🚨 [LIVE] upsertLead failed:', err);
    }
  });

  await client.initialize();

  express()
    .get('/', (_,_res)=>_.send('OK'))
    .listen(process.env.PORT||3000, ()=> {
      logger.info('🌐 HTTP server listening');
    });
}

start().catch(err=>{
  logger.error('🚨 Startup error:',err);
  process.exit(1);
});
