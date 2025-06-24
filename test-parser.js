// test-parser.js

import { loadDynamicConfig } from './src/dynamicConfig.js';
import { setDynamicConfig, parseMessage } from './src/keywordAnalyzer.js';

(async () => {
  const cfg = await loadDynamicConfig();
  setDynamicConfig(cfg);

  const samples = [
    "It’s a pleasure to make your acquaintance, Ooi Choon Heng",
    "Oh, I get it—you saw our ad on Facebook.",
    "In short, you’re looking to order a wardrobe, kitchen cabinets, and a shoe rack.",
    "Additionally, you would also need the cabinet to be around 3 meters tall.",
    "I will create a group chat with our sales designers shortly."
  ];

  for (const t of samples) {
    console.log('> ', t);
    console.log(parseMessage(t));
    console.log('-'.repeat(40));
  }
})();
