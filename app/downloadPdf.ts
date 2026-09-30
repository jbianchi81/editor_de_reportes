import puppeteer from 'puppeteer';
import { ReadableStream } from 'node:stream/web';
if (!global.ReadableStream) {
  global.ReadableStream = ReadableStream;
}
import {getYMDstrings} from './utils.js'

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (page_url: string | undefined, isSemanal: boolean=false) => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto((page_url) ? page_url : (isSemanal) ? 'http://localhost:3000/reporte_semanal_local' : 'http://localhost:3000/reporte_diario_local', { waitUntil: 'networkidle0' });
    const ymd = getYMDstrings(new Date())
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
    });
    // await page.evaluate(() => {
    //   return new Promise((resolve) => requestAnimationFrame(() => resolve));
    // });
    await page.pdf({
        path: path.join(__dirname, (isSemanal) ? `../public/pdf/reporte_semanal_${ymd.year}-${ymd.month}-${ymd.day}.pdf` : `../public/pdf/reporte_diario_${ymd.year}-${ymd.month}-${ymd.day}.pdf`),
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        margin: {
            top: '1cm',
            bottom: '1cm',
            left: '1cm',
            right: '1cm'
        },
        footerTemplate: `
      <div style="font-size:10px; width:100%; text-align:center; color:gray;">
        Página <span class="pageNumber"></span> de <span class="totalPages"></span>
      </div>
    `,
        headerTemplate: `<div></div>`
    });

    await browser.close();
};
