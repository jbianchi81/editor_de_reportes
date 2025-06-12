import puppeteer from 'puppeteer';
import { getYMDstrings } from './utils.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default async (page_url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(page_url || 'http://localhost:3000/reporte_diario', { waitUntil: 'networkidle0' });
    const ymd = getYMDstrings(new Date());
    await page.pdf({
        path: path.join(__dirname, `../public/pdf/reporte_diario_${ymd.year}-${ymd.month}-${ymd.day}.pdf`),
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
