import cron from 'node-cron';
import config from '../src/config.js';
import { upsertLead } from '../src/sheets.js';

async function runNoReplyJob() {
  console.log('Running no-reply job at', new Date().toISOString());
  // 1. Query “in progress” rows older than 48h
  // 2. For each, call upsertLead({ …, status: 'no reply' })
}

cron.schedule(config.noReplyCron, () => {
  runNoReplyJob().catch(console.error);
});