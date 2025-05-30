import { readFile } from 'node:fs/promises';

const jsonText = await readFile(new URL('../config/default.json', import.meta.url), 'utf-8');

export const config = JSON.parse(jsonText);