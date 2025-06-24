// src/config.js
import 'dotenv/config';

export default {
  serviceAccount: {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // you have PRIVATE_KEY in your .env, so pick that up:
    privateKey: process.env.GOOGLE_PRIVATE_KEY
  },
  // Your "keyword" sheet ID comes from KEYWORD_SHEET_ID
  configSheetId:  process.env.KEYWORD_SHEET_ID,
  // Your "leads" sheet ID comes from SHEET_ID
  leadsSheetId:   process.env.SHEET_ID
};
