import * as dotenv from 'dotenv';
dotenv.config();

import { startCLI } from './cli/index.js';

if (!process.env.GROQ_API_KEY) {
  console.warn("WARNING: GROQ_API_KEY is not set. The application will fail to start the model.");
  console.warn("Please add it to the .env file.");
}

await startCLI();
