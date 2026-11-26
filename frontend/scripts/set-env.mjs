// Writes src/environments/environment.prod.ts from the API_URL env var (set in Vercel).
// Example: API_URL=https://healthlink-p3i6.onrender.com/api
import { writeFileSync } from 'node:fs';

const fallback = 'https://healthlink-p3i6.onrender.com/api';
let apiUrl = (process.env.API_URL || fallback).trim().replace(/\/+$/, '');
if (!apiUrl.endsWith('/api')) apiUrl += '/api';

writeFileSync(
  new URL('../src/environments/environment.prod.ts', import.meta.url),
  `export const environment = {\n  production: true,\n  apiUrl: '${apiUrl}'\n};\n`
);
console.log(`[set-env] apiUrl = ${apiUrl}`);
