import { QuoteRecord } from '../modules/quotes.js';
import { InvoiceRecord } from '../modules/invoicing.js';
import { PurchaseOrderRecord } from '../modules/purchasing.js';

export const COMPANY_INFO = {
  name: 'TAKA SCIENTIFIC EQUIPMENT - L.L.C',
  name_ar: 'تاكا للمعدات العلمية - ذ.م.م',
  legal_form_en: 'Limited Liability Company',
  legal_form_ar: 'شركة ذات مسؤولية محدودة',
  trade_name: 'TAKA SCIENTIFIC EQUIPMENT',
  signatory_name: 'EZHILARASI MATHIVANAN',
  signatory_title_en: 'Managing Director & Authorized Signatory',
  signatory_title_ar: 'المدير العام والمفوض بالتوقيع',
  economic_reg: '1012000000006736354',
  trn: '100482910400003',
  trade_license: 'CN-2849102',
  commercial_reg: '1012000000006736354',
  hq: 'Musaffah Industrial M-14, P.O. Box 92144, Abu Dhabi, UAE',
  hq_ar: 'مصفح الصناعية M-14، ص.ب 92144، أبوظبي، الإمارات العربية المتحدة',
  branch: 'Business Bay, Dubai, UAE',
  phone: '+971 55 853 1705',
  email: 'sales@taka.ae',
  website: 'taka.ae',
  certifications: 'ICV Certified • ISO 9001:2015 • EN 14175',
  bank: {
    bank_name: 'Wio Bank PJSC',
    account_name: 'TAKA Scientific Equipment L.L.C',
    iban: 'AE820860000001234567890',
    bic: 'WIOBAEADXXX',
    currency: 'AED'
  }
};

export function renderTakaLogoSvg(width: number = 175, height: number = 46): string {
  return `<div style="width: ${width}px; height: ${height}px; display: inline-block;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1468.43 402.41">
  <g>
    <polygon fill="#054d89" points="124.46 226.67 152.7 226.59 138.09 196.01 124.46 226.67"/>
    <path fill="#054d89" d="M226.61,160.24l76.32-.04c1.42,0,2.88-.98,3.17-1.68.29-.7.37-2.53-.05-3.24l-32.35-55.03-.06-32.94-20.56.07-.09,33.21-30.2,53.62c-.88,1.56-1.23,3.38-.19,4.91.61.9,2.34,1.13,4.01,1.13ZM245.74,125.67c1.97-3.43,7.53-2.68,10.58-2.08l7.51,4.08c6.3,3.42,12.97,3.28,18.82-1.74l16.12,27.81c.37,1.15-2.45,1.68-3.62,1.67l-66.46-.07,17.05-29.67Z"/>
    <polygon fill="#054d89" points="316.4 226.65 342.65 226.62 329.35 196.74 316.4 226.65"/>
    <line fill="none" x1="63.97" y1="150.4" x2="63.63" y2="151.12"/>
    <path fill="#054d89" d="M201.2,0C90.08,0,0,90.08,0,201.21s90.08,201.21,201.2,201.21,201.2-90.08,201.2-201.21S312.33,0,201.2,0ZM215.76,153.5l19.53-34.55,11.34-20.47-.02-30.46c-2.79.25-4.98-1.1-5.39-3.57-.39-2.32,1.34-5.12,4.26-5.12h35.77c2.76,0,4.24,2.51,4.17,4.65-.08,2.73-2.23,4.35-5.16,4.07v30.76l31.05,52.41c2.2,3.04,2.48,6.28,1.11,9.92-1.18,1.92-3.9,5.51-7.78,5.51l-80.52.05c-3.11,0-5.86-2.21-7.16-3.99-1.95-2.65-2.86-6.28-1.21-9.2ZM329.95,317.45c-2.5,2.38-5.19,5.66-8.47,7.16-31.13,14.21-62.3,11.81-92.66-3.37-32.34-16.17-52.8-43.15-67.89-76.13l-44.16-.08-8.3,19.72-22.93-.03,52.5-113.6,38.63,80.57c5.08,10.59,10.23,20.21,16.73,29.95,15.31,22.35,36.68,39.65,62.09,49.19,27.54,10.34,54.96,8.72,82.57-1.13l-8.12,7.75ZM362.81,278.08c-4.07,7.8-8.69,14.25-14.35,21.11-14.89,7.06-31.28,7.61-46.8,2.66-23.27-7.42-41.96-25.05-58.37-42.92l-34.38-37.46-.3,42.6-13.33-16.9-7.84-9.96-.08-66.44c0-6.49-2.28-12.21-4.55-18.03-8.82-20.3-26.04-35.72-47.44-41.14-27.38-6.48-54.86,5.71-67.54,30.72l-3.85,8.09h57s-11.94,21.71-11.94,21.71h-31.67l.13,79.64c.02,9.16,2.7,17.67,5.94,26.08,13.54,35.09,43.01,60.55,78.4,72.61,41.66,14.19,84.74,10.2,125.79-5.75l12.77-4.8c-20.11,15.21-44.81,27.27-69.61,31.86-55.91,10.36-117.4-8.56-151.76-54.96-12.94-17.47-22.52-37.93-23.56-59.98l-.5-84.61-28.91-.11s25.88-49.84,33.33-58.41c19.12-21.8,47.9-31.6,76.56-26.08,25.13,4.84,46.45,20.46,59.4,42.5,7.2,12.24,13.26,25.49,13.35,39.85l.31,43.22,7-7.17,30.7-33.77,27.44.05-40.63,44.55,24.69,25.94c10.29,10.81,20.76,20.68,32.74,29.52,9.8,6.93,20.18,11.88,32.04,13.98,13.9,2.3,27.25-.95,39.8-8.18h0,0ZM363.01,277.76l.57-.91c-.25.39-.43.71-.57.91ZM364.14,275.96l-4.84-10.96-8.8-19.93-41.82-.02-8.96,20.26-17.1-11.38,20.62-44.42,26-58.07,13.22,29.21,31.98,68.05c-.09,5.05-2.14,11.02-4.5,16.26-2.08,4.62-4.4,8.66-5.81,11Z"/>
  </g>
  <g>
    <path fill="#054d89" d="M472.54,30h221.51v58.23h-74.32v177.59h-72.87V88.23h-74.32V30Z"/>
    <path fill="#054d89" d="M849.64,226.89h-82.73l-11.49,38.93h-74.4l88.63-235.82h79.49l88.61,235.82h-76.31l-11.8-38.93ZM834.53,175.9l-26.03-84.77-25.76,84.77h51.79Z"/>
    <path fill="#054d89" d="M961.23,30h72.87v89.12l76.33-89.12h96.92l-86.06,89.01,89.92,146.81h-89.74l-49.72-96.98-37.65,39.44v57.54h-72.87V30Z"/>
    <path fill="#054d89" d="M1380.32,226.89h-82.73l-11.49,38.93h-74.4l88.63-235.82h79.49l88.61,235.82h-76.31l-11.8-38.93ZM1365.21,175.9l-26.03-84.77-25.76,84.77h51.79Z"/>
    <path fill="#054d89" d="M485.16,360.97c-3.39-1.38-6.09-3.43-8.11-6.14-2.03-2.71-3.09-5.97-3.2-9.78h15.14c.22,2.16.97,3.8,2.25,4.93,1.28,1.13,2.94,1.7,4.99,1.7s3.77-.48,4.99-1.45c1.22-.97,1.83-2.31,1.83-4.02,0-1.44-.49-2.62-1.46-3.57-.97-.94-2.16-1.71-3.58-2.32-1.41-.61-3.42-1.3-6.03-2.07-3.77-1.16-6.85-2.32-9.24-3.48-2.39-1.16-4.44-2.87-6.16-5.14-1.72-2.27-2.58-5.22-2.58-8.87,0-5.42,1.97-9.66,5.91-12.73,3.94-3.07,9.07-4.6,15.4-4.6s11.62,1.53,15.56,4.6c3.94,3.07,6.05,7.34,6.32,12.81h-15.39c-.11-1.88-.81-3.36-2.08-4.44-1.28-1.08-2.91-1.62-4.91-1.62-1.72,0-3.11.45-4.16,1.37-1.05.91-1.58,2.23-1.58,3.94,0,1.88.89,3.35,2.66,4.39,1.78,1.05,4.55,2.18,8.32,3.4,3.77,1.27,6.84,2.49,9.2,3.65,2.36,1.16,4.4,2.85,6.12,5.06,1.72,2.21,2.58,5.06,2.58,8.54s-.85,6.33-2.54,9.04c-1.69,2.71-4.15,4.87-7.36,6.47-3.22,1.6-7.02,2.4-11.4,2.4s-8.1-.69-11.48-2.07Z"/>
    <path fill="#054d89" d="M528.01,317.89c2.5-4.51,5.98-8.01,10.44-10.53,4.46-2.51,9.53-3.77,15.19-3.77,6.93,0,12.87,1.82,17.81,5.47,4.94,3.65,8.24,8.62,9.9,14.93h-15.64c-1.16-2.43-2.82-4.28-4.95-5.56-2.14-1.27-4.56-1.91-7.28-1.91-4.38,0-7.93,1.52-10.65,4.56-2.72,3.04-4.08,7.1-4.08,12.19s1.36,9.15,4.08,12.19c2.72,3.04,6.27,4.56,10.65,4.56,2.72,0,5.14-.64,7.28-1.91,2.13-1.27,3.79-3.12,4.95-5.56h15.64c-1.67,6.3-4.97,11.26-9.9,14.88-4.94,3.62-10.87,5.43-17.81,5.43-5.66,0-10.72-1.26-15.19-3.77-4.47-2.51-7.95-6.01-10.44-10.49-2.5-4.48-3.74-9.59-3.74-15.34s1.25-10.88,3.74-15.38Z"/>
    <path fill="#054d89" d="M604.32,304.25v58.21h-14.23v-58.21h14.23Z"/>
    <path fill="#054d89" d="M628.87,315.61v11.77h19.06v10.94h-19.06v12.77h21.55v11.36h-35.78v-58.21h35.78v11.36h-21.55Z"/>
    <path fill="#054d89" d="M711.92,362.46h-14.23l-23.8-35.9v35.9h-14.23v-58.21h14.23l23.8,36.07v-36.07h14.23v58.21Z"/>
    <path fill="#054d89" d="M764.26,304.25v11.36h-15.48v46.85h-14.23v-46.85h-15.48v-11.36h45.19Z"/>
    <path fill="#054d89" d="M785.65,304.25v58.21h-14.23v-58.21h14.23Z"/>
    <path fill="#054d89" d="M834,304.25v11.36h-23.8v12.27h17.81v11.03h-17.81v23.55h-14.23v-58.21h38.03Z"/>
    <path fill="#054d89" d="M855.71,304.25v58.21h-14.23v-58.21h14.23Z"/>
    <path fill="#054d89" d="M867.36,317.89c2.5-4.51,5.98-8.01,10.44-10.53,4.46-2.51,9.53-3.77,15.19-3.77,6.93,0,12.87,1.82,17.81,5.47s8.24,8.62,9.9,14.93h-15.64c-1.16-2.43-2.82-4.28-4.95-5.56-2.14-1.27-4.56-1.91-7.28-1.91-4.38,0-7.93,1.52-10.65,4.56-2.72,3.04-4.08,7.1-4.08,12.19s1.36,9.15,4.08,12.19c2.72,3.04,6.27,4.56,10.65,4.56,2.72,0,5.14-.64,7.28-1.91,2.13-1.27,3.79-3.12,4.95-5.56h15.64c-1.67,6.3-4.97,11.26-9.9,14.88-4.94,3.62-10.87,5.43-17.81,5.43-5.66,0-10.72-1.26-15.19-3.77-4.47-2.51-7.95-6.01-10.44-10.49-2.5-4.48-3.74-9.59-3.74-15.34s1.25-10.88,3.74-15.38Z"/>
    <path fill="#054d89" d="M961.32,315.61v11.77h19.06v10.94h-19.06v12.77h21.55v11.36h-35.78v-58.21h35.78v11.36h-21.55Z"/>
    <path fill="#054d89" d="M1033.71,372.41l-7.49-10.03c-2.22.44-4.38.66-6.49.66-5.49,0-10.53-1.27-15.1-3.81-4.58-2.54-8.21-6.09-10.9-10.65-2.69-4.56-4.04-9.69-4.04-15.38s1.34-10.81,4.04-15.34c2.69-4.53,6.32-8.07,10.9-10.61,4.58-2.54,9.61-3.81,15.1-3.81s10.53,1.27,15.1,3.81c4.58,2.54,8.18,6.08,10.82,10.61,2.63,4.53,3.95,9.65,3.95,15.34,0,4.98-1.01,9.52-3.04,13.64s-4.84,7.53-8.45,10.24l12.81,15.34h-17.22ZM1008.46,345.5c2.8,3.07,6.56,4.6,11.28,4.6s8.39-1.55,11.19-4.64c2.8-3.09,4.2-7.18,4.2-12.27s-1.4-9.24-4.2-12.31c-2.8-3.07-6.53-4.6-11.19-4.6s-8.48,1.52-11.28,4.56c-2.8,3.04-4.2,7.16-4.2,12.35s1.4,9.24,4.2,12.31Z"/>
    <path fill="#054d89" d="M1071.66,304.25v34.83c0,3.48.86,6.16,2.58,8.04,1.72,1.88,4.24,2.82,7.57,2.82s5.88-.94,7.66-2.82c1.77-1.88,2.66-4.56,2.66-8.04v-34.83h14.23v34.74c0,5.2-1.11,9.59-3.33,13.18-2.22,3.59-5.2,6.3-8.94,8.13-3.75,1.82-7.92,2.74-12.52,2.74s-8.72-.9-12.36-2.7c-3.63-1.8-6.51-4.51-8.61-8.13-2.11-3.62-3.16-8.03-3.16-13.22v-34.74h14.23Z"/>
    <path fill="#054d89" d="M1130.57,304.25v58.21h-14.23v-58.21h14.23Z"/>
    <path fill="#054d89" d="M1183.08,332.24c-1.55,2.79-3.94,5.05-7.16,6.76-3.22,1.71-7.21,2.57-11.98,2.57h-8.82v20.9h-14.23v-58.21h23.05c4.66,0,8.6.8,11.82,2.4,3.22,1.6,5.63,3.81,7.24,6.63,1.61,2.82,2.41,6.05,2.41,9.7,0,3.37-.78,6.45-2.33,9.24ZM1168.94,328.38c1.33-1.27,2-3.07,2-5.39s-.67-4.12-2-5.39c-1.33-1.27-3.36-1.91-6.08-1.91h-7.74v14.59h7.74c2.72,0,4.74-.64,6.08-1.91Z"/>
    <path fill="#054d89" d="M1258.98,304.25v58.21h-14.23v-34.91l-13.06,34.91h-11.48l-13.15-34.99v34.99h-14.23v-58.21h16.81l16.39,40.3,16.23-40.3h16.73Z"/>
    <path fill="#054d89" d="M1283.44,315.61v11.77h19.06v10.94h-19.06v12.77h21.55v11.36h-35.78v-58.21h35.78v11.36h-21.55Z"/>
    <path fill="#054d89" d="M1366.49,362.46h-14.23l-23.8-35.9v35.9h-14.23v-58.21h14.23l23.8,36.07v-36.07h14.23v58.21Z"/>
    <path fill="#054d89" d="M1418.83,304.25v11.36h-15.48v46.85h-14.23v-46.85h-15.48v-11.36h45.19Z"/>
    <path fill="#054d89" d="M1435.64,360.97c-3.39-1.38-6.09-3.43-8.11-6.14-2.03-2.71-3.09-5.97-3.2-9.78h15.14c.22,2.16.97,3.8,2.25,4.93,1.28,1.13,2.94,1.7,4.99,1.7s3.77-.48,4.99-1.45c1.22-.97,1.83-2.31,1.83-4.02,0-1.44-.49-2.62-1.46-3.57-.97-.94-2.16-1.71-3.58-2.32-1.41-.61-3.42-1.3-6.03-2.07-3.77-1.16-6.85-2.32-9.24-3.48-2.39-1.16-4.44-2.87-6.16-5.14-1.72-2.27-2.58-5.22-2.58-8.87,0-5.42,1.97-9.66,5.91-12.73,3.94-3.07,9.07-4.6,15.4-4.6s11.62,1.53,15.56,4.6c3.94,3.07,6.05,7.34,6.32,12.81h-15.39c-.11-1.88-.81-3.36-2.08-4.44-1.28-1.08-2.91-1.62-4.91-1.62-1.72,0-3.11.45-4.16,1.37-1.05.91-1.58,2.23-1.58,3.94,0,1.88.89,3.35,2.66,4.39,1.78,1.05,4.55,2.18,8.32,3.4,3.77,1.27,6.84,2.49,9.2,3.65,2.36,1.16,4.4,2.85,6.12,5.06,1.72,2.21,2.58,5.06,2.58,8.54s-.85,6.33-2.54,9.04c-1.69,2.71-4.15,4.87-7.36,6.47-3.22,1.6-7.02,2.4-11.4,2.4s-8.1-.69-11.48-2.07Z"/>
  </g>
</svg></div>`;
}

export function renderOfficialSealSvg(idSuffix: string = 'inv'): string {
  return `
    <svg width="105" height="105" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.94; transform: rotate(-2deg); flex-shrink: 0;">
      <circle cx="110" cy="110" r="102" stroke="#1d4ed8" stroke-width="3.5" fill="none"/>
      <circle cx="110" cy="110" r="88" stroke="#1d4ed8" stroke-width="1.8" stroke-dasharray="4 2" fill="none"/>
      <circle cx="110" cy="110" r="64" stroke="#1d4ed8" stroke-width="1.2" fill="none"/>
      <path id="sealPathEn_${idSuffix}" d="M 30,110 A 80,80 0 0,1 190,110" fill="none"/>
      <text font-family="'Segoe UI', sans-serif" font-size="8.8" font-weight="900" fill="#1d4ed8" letter-spacing="0.8">
        <textPath href="#sealPathEn_${idSuffix}" startOffset="50%" text-anchor="middle">
          TAKA SCIENTIFIC EQUIPMENT L.L.C
        </textPath>
      </text>
      <path id="sealPathAr_${idSuffix}" d="M 190,110 A 80,80 0 0,1 30,110" fill="none"/>
      <text font-family="'Segoe UI', Tahoma, sans-serif" font-size="9.8" font-weight="900" fill="#1d4ed8">
        <textPath href="#sealPathAr_${idSuffix}" startOffset="50%" text-anchor="middle">
          تاكا للمعدات العلمية - ذ.م.م
        </textPath>
      </text>
      <text x="110" y="93" font-family="'Segoe UI', sans-serif" font-size="7.5" font-weight="800" fill="#1d4ed8" text-anchor="middle">★ ABU DHABI • UAE ★</text>
      <text x="110" y="105" font-family="'Segoe UI', sans-serif" font-size="8.5" font-weight="900" fill="#1d4ed8" text-anchor="middle">EZHILARASI MATHIVANAN</text>
      <text x="110" y="116" font-family="'Segoe UI', sans-serif" font-size="7" font-weight="700" fill="#1d4ed8" text-anchor="middle">MANAGING DIRECTOR</text>
      <text x="110" y="127" font-family="'Segoe UI', sans-serif" font-size="7.5" font-weight="800" fill="#1d4ed8" text-anchor="middle">TRN: 100482910400003</text>
      <text x="110" y="138" font-family="'Segoe UI', sans-serif" font-size="7" font-weight="800" fill="#1d4ed8" text-anchor="middle">REG: 1012000000006736354</text>
    </svg>
  `;
}

export function renderSignatureBlock(idSuffix: string = 'inv'): string {
  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin: 16px 0 10px 0; padding-top: 6px;">
      <div>
        <div style="font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Authorized Signature / التوقيع المعتمد:</div>
        <div style="font-family: 'Brush Script MT', 'Segoe Script', cursive, sans-serif; font-size: 22px; color: #0f172a; margin: 2px 0;">Ezhilarasi Mathivanan</div>
        <div style="font-weight: 800; font-size: 11px; color: #0f172a;">${COMPANY_INFO.signatory_name}</div>
        <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">${COMPANY_INFO.signatory_title_en} &bull; ${COMPANY_INFO.signatory_title_ar}</div>
      </div>
      <div>
        ${renderOfficialSealSvg(idSuffix)}
      </div>
    </div>
  `;
}

export function renderDocumentFooter(docTypeLabel: string = 'Official Commercial Document'): string {
  return `
    <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 14px; border-top: 1.5px solid #0f172a; padding-top: 8px; margin-top: 16px; font-size: 8px; color: #64748b; line-height: 1.4;">
      <div>
        <div style="font-weight: 800; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px;">ABU DHABI HEADQUARTERS (HQ)</div>
        Musaffah Industrial M-14, P.O. Box 92144<br>
        Abu Dhabi, United Arab Emirates
      </div>
      <div>
        <div style="font-weight: 800; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px;">DUBAI REGIONAL BRANCH</div>
        Business Bay, Dubai<br>
        United Arab Emirates
      </div>
      <div>
        <div style="font-weight: 800; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px;">INQUIRIES & VERIFICATION</div>
        ${COMPANY_INFO.website} &bull; ${COMPANY_INFO.email}<br>
        Tel / WhatsApp: ${COMPANY_INFO.phone}
      </div>
    </div>
    <div style="border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 4px; font-size: 7.5px; color: #94a3b8; display: flex; justify-content: space-between;">
      <div>Tax TRN: <strong style="color: #475569;">${COMPANY_INFO.trn}</strong> &bull; License: <strong style="color: #475569;">${COMPANY_INFO.trade_license}</strong> &bull; Unified Reg: <strong style="color: #475569;">${COMPANY_INFO.economic_reg}</strong></div>
      <div>${COMPANY_INFO.certifications} &bull; ${docTypeLabel}</div>
    </div>
  `;
}

const COMMON_CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 24px;
    font-size: 10.5px;
    line-height: 1.5;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .tabular-nums { font-variant-numeric: tabular-nums; }
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 1.5px solid #0f172a;
    margin-bottom: 14px;
  }
  .doc-meta { text-align: right; }
  .doc-title-en {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: #0f172a;
    margin: 0;
    line-height: 1.2;
  }
  .doc-title-ar {
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    margin: 2px 0 6px 0;
    direction: rtl;
  }
  .doc-meta-row {
    font-size: 9.5px;
    color: #475569;
    line-height: 1.45;
  }
  .doc-meta-row strong { color: #0f172a; }
  .doc-meta-ref { color: #054d89; font-weight: 700; }

  /* Two-column Party & Specs layout - NO BOXES */
  .parties-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 24px;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .party-col h4 {
    margin: 0 0 4px 0;
    font-size: 8.5px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  .party-name {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 3px;
  }
  .party-details {
    font-size: 9.5px;
    color: #475569;
    line-height: 1.5;
  }

  /* Clean minimal table */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  .items-table th {
    border-top: 1.5px solid #0f172a;
    border-bottom: 1.5px solid #0f172a;
    padding: 8px 6px;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
    color: #0f172a;
    background: transparent;
  }
  .items-table td {
    padding: 9px 6px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 10px;
    vertical-align: top;
  }
  .th-sub {
    font-size: 7.5px;
    color: #64748b;
    font-weight: 500;
    text-transform: none;
    margin-top: 1px;
  }

  /* Settlement & Totals Grid - NO BOXES */
  .settlement-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 24px;
    margin-bottom: 14px;
  }
  .bank-details {
    font-size: 9px;
    color: #475569;
    line-height: 1.5;
  }
  .bank-details h5 {
    margin: 0 0 4px 0;
    font-size: 8.5px;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .totals-table {
    width: 100%;
    font-size: 10.5px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid #f1f5f9;
    color: #475569;
  }
  .totals-row.grand {
    border-top: 1.5px solid #0f172a;
    border-bottom: 2px solid #0f172a;
    font-size: 12.5px;
    font-weight: 800;
    color: #0f172a;
    padding: 6px 0;
    margin-top: 2px;
  }

  /* Terms */
  .terms-block {
    margin-bottom: 12px;
    font-size: 9px;
    color: #475569;
    line-height: 1.45;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
  }
  .terms-title {
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
  }
`;

export function renderInvoiceHtml(inv: InvoiceRecord): string {
  const isPaid = inv.balance_due <= 0;
  const itemsHtml = (inv.items || []).map((item, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b;">${idx + 1}</td>
      <td>
        <div style="font-weight: 700; color: #0f172a;">${item.description}</div>
      </td>
      <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
      <td style="text-align: right;" class="tabular-nums">${Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; color: #054d89; font-weight: 600;">5%</td>
      <td style="text-align: right;" class="tabular-nums">${Number(item.vat_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-weight: 700; color: #0f172a;" class="tabular-nums">${Number(item.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TAX INVOICE: ${inv.invoice_number}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  <div class="doc-header">
    <div>
      ${renderTakaLogoSvg(175, 46)}
      <div style="font-size: 9.5px; font-weight: 700; color: #054d89; margin-top: 4px; letter-spacing: 0.3px;">SCIENTIFIC EQUIPMENT & LAB FURNITURE &bull; DELIVERED & INSTALLED ACROSS THE UAE</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
        Head Office: Musaffah Industrial M-14, Abu Dhabi, UAE &bull; sales@taka.ae
      </div>
    </div>

    <div class="doc-meta">
      <h1 class="doc-title-en">TAX INVOICE</h1>
      <div class="doc-title-ar">فاتورة ضريبية</div>
      <div class="doc-meta-row">REF: <span class="doc-meta-ref">${inv.invoice_number}</span></div>
      <div class="doc-meta-row">DATE: <strong>${inv.date}</strong></div>
      <div class="doc-meta-row">DUE: <strong style="color: ${isPaid ? '#0E8668' : '#b91c1c'};">${inv.due_date}</strong></div>
      <div class="doc-meta-row">STATUS: <strong style="color: ${isPaid ? '#0E8668' : '#054d89'}; text-transform: uppercase;">${isPaid ? 'PAID' : inv.status}</strong></div>
    </div>
  </div>

  <div class="parties-grid">
    <div class="party-col">
      <h4>BILLED TO / CUSTOMER (العميل):</h4>
      <div class="party-name">${inv.customer_company || inv.customer_name || 'Valued Client'}</div>
      <div class="party-details">
        ${inv.customer_name && inv.customer_company ? `Attn: ${inv.customer_name}<br>` : ''}
        Tax TRN: <strong style="color: #0f172a;">${inv.customer_trn || 'N/A (Consumer / End-User)'}</strong><br>
        Address: ${inv.billing_address || 'Abu Dhabi / Dubai, UAE'}<br>
        ${inv.customer_email ? `Email: ${inv.customer_email}` : ''}
      </div>
    </div>

    <div class="party-col">
      <h4>SUPPLY & SETTLEMENT SPECIFICATIONS (بيانات التوريد):</h4>
      <div class="party-details">
        Amount Due: <strong style="font-size: 15px; color: #0f172a;" class="tabular-nums">AED ${Number(inv.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong><br>
        Place of Supply: <strong>Abu Dhabi, United Arab Emirates</strong><br>
        Settlement Facility: Approved Institutional Terms<br>
        Currency: <strong>AED (UAE Dirham)</strong>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 44%; text-align: left;">
          <div>Scope of Supply & Description</div>
          <div class="th-sub">الصنف والبيان والمواصفات</div>
        </th>
        <th style="width: 7%; text-align: center;">
          <div>Qty</div>
          <div class="th-sub">الكمية</div>
        </th>
        <th style="width: 14%; text-align: right;">
          <div>Unit Price (AED)</div>
          <div class="th-sub">سعر الوحدة</div>
        </th>
        <th style="width: 8%; text-align: right;">
          <div>VAT %</div>
          <div class="th-sub">النسبة</div>
        </th>
        <th style="width: 10%; text-align: right;">
          <div>VAT (AED)</div>
          <div class="th-sub">الضريبة</div>
        </th>
        <th style="width: 12%; text-align: right;">
          <div>Total (AED)</div>
          <div class="th-sub">الإجمالي</div>
        </th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="settlement-grid">
    <div class="bank-details">
      <h5>PAYMENT SETTLEMENT COORDINATES / السداد البنكي</h5>
      Beneficiary: <strong>${COMPANY_INFO.bank.account_name}</strong><br>
      Bank: <strong>${COMPANY_INFO.bank.bank_name}</strong> &bull; Currency: <strong>AED</strong><br>
      IBAN: <strong style="color: #054d89; font-size: 10.5px;" class="tabular-nums">${COMPANY_INFO.bank.iban}</strong><br>
      SWIFT / BIC: <strong>${COMPANY_INFO.bank.bic}</strong>
    </div>

    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal (Net) / المجموع الفرعي:</span>
        <span class="tabular-nums" style="font-weight: 600; color: #0f172a;">AED ${Number(inv.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row">
        <span>UAE VAT (5%) / الضريبة:</span>
        <span class="tabular-nums" style="font-weight: 600; color: #054d89;">AED ${Number(inv.vat_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row grand">
        <span>Total Due / إجمالي المستحق:</span>
        <span class="tabular-nums">AED ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      ${inv.paid_amount > 0 ? `
        <div class="totals-row" style="color: #15803d; font-weight: 600;">
          <span>Settled / المسدد:</span>
          <span class="tabular-nums">AED ${Number(inv.paid_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row" style="color: #b91c1c; font-weight: 700;">
          <span>Outstanding Balance / المتبقي:</span>
          <span class="tabular-nums">AED ${Number(inv.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      ` : ''}
    </div>
  </div>

  ${inv.notes ? `
    <div class="terms-block">
      <div class="terms-title">Notes / ملاحظات:</div>
      <div>${inv.notes}</div>
    </div>
  ` : ''}

  ${renderSignatureBlock('inv')}
  ${renderDocumentFooter('UAE Federal Decree-Law No. 8 &bull; Official Tax Invoice')}
</body>
</html>`;
}

export function renderQuotationHtml(quote: QuoteRecord): string {
  const itemsHtml = (quote.items || []).map((item, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b;">${idx + 1}</td>
      <td>
        <div style="font-weight: 700; color: #0f172a;">${item.description}</div>
      </td>
      <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
      <td style="text-align: right;" class="tabular-nums">${Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; color: #054d89; font-weight: 600;">5%</td>
      <td style="text-align: right;" class="tabular-nums">${Number(item.vat_amount || (item.quantity * item.unit_price * 0.05)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-weight: 700; color: #0f172a;" class="tabular-nums">${Number(item.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Commercial Quotation: ${quote.quote_number}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  <div class="doc-header">
    <div>
      ${renderTakaLogoSvg(175, 46)}
      <div style="font-size: 9.5px; font-weight: 700; color: #054d89; margin-top: 4px; letter-spacing: 0.3px;">SCIENTIFIC EQUIPMENT & LAB FURNITURE &bull; DELIVERED & INSTALLED ACROSS THE UAE</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
        Head Office: Musaffah Industrial M-14, Abu Dhabi, UAE &bull; sales@taka.ae
      </div>
    </div>

    <div class="doc-meta">
      <h1 class="doc-title-en">COMMERCIAL QUOTATION</h1>
      <div class="doc-title-ar">عرض أسعار تجاري</div>
      <div class="doc-meta-row">REF: <span class="doc-meta-ref">${quote.quote_number}</span></div>
      <div class="doc-meta-row">DATE: <strong>${quote.date}</strong></div>
      <div class="doc-meta-row">VALIDITY: <strong>${quote.expiry_date}</strong></div>
      <div class="doc-meta-row">STATUS: <strong style="color: #054d89; text-transform: uppercase;">${quote.status}</strong></div>
    </div>
  </div>

  <div class="parties-grid">
    <div class="party-col">
      <h4>ADDRESSED TO / CLIENT (العميل):</h4>
      <div class="party-name">${quote.customer_company || quote.customer_name || 'Valued Client'}</div>
      <div class="party-details">
        ${quote.customer_name && quote.customer_company ? `Attn: ${quote.customer_name}<br>` : ''}
        Tax TRN: <strong style="color: #0f172a;">${quote.customer_trn || 'N/A'}</strong><br>
        Address: ${quote.billing_address || 'Abu Dhabi / Dubai, UAE'}<br>
        ${quote.customer_email ? `Email: ${quote.customer_email}` : ''}
      </div>
    </div>

    <div class="party-col">
      <h4>PROPOSAL & SETTLEMENT SPECIFICATIONS (بيانات العرض):</h4>
      <div class="party-details">
        Proposal Total: <strong style="font-size: 15px; color: #0f172a;" class="tabular-nums">${quote.currency} ${Number(quote.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong><br>
        Place of Supply: <strong>Abu Dhabi, United Arab Emirates</strong><br>
        Payment Terms: <strong>Net 30 Days on Official LPO</strong><br>
        Currency: <strong>${quote.currency}</strong>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 44%; text-align: left;">
          <div>Scope of Supply & Specifications</div>
          <div class="th-sub">الوصف والمواصفات الفنية المعتمدة</div>
        </th>
        <th style="width: 7%; text-align: center;">
          <div>Qty</div>
          <div class="th-sub">الكمية</div>
        </th>
        <th style="width: 14%; text-align: right;">
          <div>Unit Price (${quote.currency})</div>
          <div class="th-sub">سعر الوحدة</div>
        </th>
        <th style="width: 8%; text-align: right;">
          <div>VAT %</div>
          <div class="th-sub">النسبة</div>
        </th>
        <th style="width: 10%; text-align: right;">
          <div>VAT (${quote.currency})</div>
          <div class="th-sub">الضريبة</div>
        </th>
        <th style="width: 12%; text-align: right;">
          <div>Total (${quote.currency})</div>
          <div class="th-sub">الإجمالي</div>
        </th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="settlement-grid">
    <div class="bank-details">
      <h5>BANK WIRE SETTLEMENT COORDINATES / السداد البنكي</h5>
      Beneficiary: <strong>${COMPANY_INFO.bank.account_name}</strong><br>
      Bank: <strong>${COMPANY_INFO.bank.bank_name}</strong> &bull; Currency: <strong>AED</strong><br>
      IBAN: <strong style="color: #054d89; font-size: 10.5px;" class="tabular-nums">${COMPANY_INFO.bank.iban}</strong><br>
      SWIFT / BIC: <strong>${COMPANY_INFO.bank.bic}</strong>
    </div>

    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal (Net) / المجموع الصافي:</span>
        <span class="tabular-nums" style="font-weight: 600; color: #0f172a;">${quote.currency} ${Number(quote.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row">
        <span>UAE VAT (5%) / الضريبة:</span>
        <span class="tabular-nums" style="font-weight: 600; color: #054d89;">${quote.currency} ${Number(quote.vat_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row grand">
        <span>Grand Total / المبلغ الإجمالي:</span>
        <span class="tabular-nums">${quote.currency} ${Number(quote.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  </div>

  <div class="terms-block">
    <div class="terms-title">Commercial Terms & Scope / الشروط التجارية:</div>
    <div>${quote.terms || '• Terms: Net 30 Days corporate facility against official LPO\n• Warranty: 3 Years Comprehensive Manufacturer Warranty with regional onsite support\n• Scope: Unboxing, positioning, mechanical gas hook-up, face-velocity containment testing, and full commissioning included across the UAE.'}</div>
  </div>

  ${renderSignatureBlock('quote')}
  ${renderDocumentFooter('TAKA Scientific Equipment L.L.C &bull; Commercial Proposal')}
</body>
</html>`;
}

export function renderPurchaseOrderHtml(po: PurchaseOrderRecord): string {
  const itemsHtml = (po.items || []).map((item, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b;">${idx + 1}</td>
      <td>
        <div style="font-weight: 700; color: #0f172a;">${item.description}</div>
      </td>
      <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
      <td style="text-align: right;" class="tabular-nums">${Number(item.unit_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td style="text-align: right; font-weight: 700; color: #0f172a;" class="tabular-nums">${Number(item.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PURCHASE ORDER: ${po.po_number}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  <div class="doc-header">
    <div>
      ${renderTakaLogoSvg(175, 46)}
      <div style="font-size: 9.5px; font-weight: 700; color: #054d89; margin-top: 4px; letter-spacing: 0.3px;">SCIENTIFIC EQUIPMENT & LAB FURNITURE &bull; DELIVERED & INSTALLED ACROSS THE UAE</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
        Head Office: Musaffah Industrial M-14, Abu Dhabi, UAE &bull; sales@taka.ae
      </div>
    </div>

    <div class="doc-meta">
      <h1 class="doc-title-en">LOCAL PURCHASE ORDER</h1>
      <div class="doc-title-ar">أمر شراء محلي (LPO)</div>
      <div class="doc-meta-row">REF: <span class="doc-meta-ref">${po.po_number}</span></div>
      <div class="doc-meta-row">DATE: <strong>${po.date}</strong></div>
      <div class="doc-meta-row">DELIVERY: <strong>${po.expected_delivery_date || 'Standard'}</strong></div>
      <div class="doc-meta-row">STATUS: <strong style="color: #054d89; text-transform: uppercase;">${po.status}</strong></div>
    </div>
  </div>

  <div class="parties-grid">
    <div class="party-col">
      <h4>VENDOR / SUPPLIER (المورد المعتمد):</h4>
      <div class="party-name">${po.vendor_company || po.vendor_name || 'Authorized Supplier'}</div>
      <div class="party-details">
        ${po.vendor_name && po.vendor_company ? `Attn: ${po.vendor_name}<br>` : ''}
        Tax TRN: <strong style="color: #0f172a;">${po.vendor_trn || 'N/A'}</strong><br>
        Address: ${po.vendor_address || 'Authorized Manufacturer'}
      </div>
    </div>

    <div class="party-col">
      <h4>DELIVERY & PROCUREMENT DIRECTIVES (بيانات الاستلام):</h4>
      <div class="party-details">
        Order Total: <strong style="font-size: 15px; color: #0f172a;" class="tabular-nums">${po.currency} ${Number(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong><br>
        Delivery Location: <strong>Musaffah M-14 Central Facility, Abu Dhabi</strong><br>
        Receiving Hours: Sunday&ndash;Thursday, 8:00 AM &ndash; 4:00 PM GST<br>
        Currency: <strong>${po.currency}</strong>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 55%; text-align: left;">
          <div>Item & Specification</div>
          <div class="th-sub">الوصف والمواصفات الفنية</div>
        </th>
        <th style="width: 8%; text-align: center;">
          <div>Qty</div>
          <div class="th-sub">الكمية</div>
        </th>
        <th style="width: 16%; text-align: right;">
          <div>Unit Cost (${po.currency})</div>
          <div class="th-sub">سعر الوحدة</div>
        </th>
        <th style="width: 16%; text-align: right;">
          <div>Total (${po.currency})</div>
          <div class="th-sub">الإجمالي</div>
        </th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="settlement-grid">
    <div class="bank-details">
      <h5>DELIVERY & COMPLIANCE REQUIREMENTS</h5>
      • All supplied equipment must include Factory Inspection Certificates & Calibration Reports.<br>
      • Consignee: TAKA Scientific Equipment L.L.C, Central Warehouse, Musaffah M-14, Abu Dhabi.<br>
      • Commercial Invoice & Packing List required upon dispatch.
    </div>

    <div class="totals-table">
      <div class="totals-row">
        <span>Order Subtotal / المجموع الفرعي:</span>
        <span class="tabular-nums" style="font-weight: 600; color: #0f172a;">${po.currency} ${Number(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="totals-row grand">
        <span>Total Purchase Order (${po.currency}):</span>
        <span class="tabular-nums">${po.currency} ${Number(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  </div>

  ${renderSignatureBlock('po')}
  ${renderDocumentFooter('TAKA Scientific Equipment L.L.C &bull; Official Purchase Order')}
</body>
</html>`;
}