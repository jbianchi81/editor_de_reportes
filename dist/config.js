import { readFile } from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonText = await readFile(new URL(path.join(__dirname, '../config/default.json'), import.meta.url), 'utf-8');
export const config = JSON.parse(jsonText);
