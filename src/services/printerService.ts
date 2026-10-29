/**
 * Dalani Real Estate Platform - Official Printing Service
 * Supports native Android System PrintManager & cross-browser print engine
 */

import { PropertyContract } from '../types';

declare global {
  interface Window {
    AndroidPrinter?: {
      isAvailable?: () => boolean;
      printDocument?: (jobTitle: string, htmlContent: string) => void;
    };
  }
}

/**
 * Check if the native Android printer bridge is available
 */
export const isAndroidNativePrinterAvailable = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.AndroidPrinter?.printDocument);
};

/**
 * Generates an SVG Barcode element for the contract verification number
 */
const generateSvgBarcode = (code: string): string => {
  const bars = [];
  const cleanCode = (code || 'DLN-000000').toUpperCase();
  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    const width1 = (charCode % 3) + 1.2;
    const width2 = ((charCode * 2) % 3) + 1;
    bars.push(`<rect x="${i * 9 + 4}" y="2" width="${width1}" height="28" fill="#16324F"/>`);
    bars.push(`<rect x="${i * 9 + 4 + width1 + 1}" y="2" width="${width2}" height="28" fill="#12A889"/>`);
  }
  return `
    <svg width="180" height="34" viewBox="0 0 180 34" xmlns="http://www.w3.org/2000/svg">
      ${bars.join('')}
    </svg>
  `;
};

/**
 * Generates official A4 RTL Printable HTML for a Property Contract
 */
export const generateContractPrintHtml = (contract: PropertyContract): string => {
  const isSale = contract.contractType === 'sale';
  const contractTitle = isSale
    ? 'عقد بيع عقاري ومناقلة ملكية شرعية'
    : 'عقد إيجار عقاري رسمي موحد';

  const currencySymbol =
    contract.financialTerms.currency === 'USD'
      ? 'دولار أمريكي ($)'
      : contract.financialTerms.currency === 'SAR'
      ? 'ريال سعودي (ر.س)'
      : 'ريال يمني (ر.ي)';

  const formattedTotal = Number(contract.financialTerms.totalAmount || 0).toLocaleString('ar-YE');
  const formattedDeposit = Number(contract.financialTerms.depositAmount || 0).toLocaleString('ar-YE');

  const creationDate = contract.createdAt
    ? new Date(contract.createdAt).toLocaleDateString('ar-YE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('ar-YE');

  const statusLabel =
    contract.status === 'signed'
      ? 'عقد نافذ وموثق رسمياً'
      : contract.status === 'approved'
      ? 'معتمد بالتراضي بانتظار التوقيع'
      : contract.status === 'under_review'
      ? 'قيد المراجعة والتدقيق'
      : 'مسودة رسمية معتمدة';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${contractTitle} - ${contract.contractNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm 14mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      direction: rtl;
    }

    .contract-page {
      position: relative;
      background: #ffffff;
      min-height: 100%;
    }

    /* Watermark */
    .watermark {
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 52pt;
      font-weight: bold;
      color: rgba(18, 168, 137, 0.04);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }

    /* Official Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #16324F;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }

    .header-table td {
      vertical-align: middle;
      padding: 4px;
    }

    .header-title-box {
      text-align: center;
    }

    .country-title {
      font-size: 11pt;
      font-weight: bold;
      color: #475569;
      margin: 0 0 2px 0;
    }

    .main-doc-title {
      font-size: 15pt;
      font-weight: 800;
      color: #16324F;
      margin: 0 0 4px 0;
    }

    .doc-subtitle {
      font-size: 9.5pt;
      color: #12A889;
      font-weight: bold;
      margin: 0;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-name {
      font-size: 16pt;
      font-weight: 900;
      color: #16324F;
      letter-spacing: -0.5px;
    }

    .brand-badge {
      display: inline-block;
      font-size: 8pt;
      color: #ffffff;
      background: #12A889;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
    }

    .brand-sub {
      font-size: 8pt;
      color: #64748b;
      margin-top: 2px;
    }

    .meta-box {
      text-align: left;
      font-size: 8.5pt;
      color: #334155;
    }

    .meta-pill {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8.5pt;
      font-weight: bold;
      background: #e6f7f3;
      color: #0d705b;
      border: 1px solid #a7e4d5;
    }

    /* Sections */
    .section-title {
      font-size: 11.5pt;
      font-weight: bold;
      color: #16324F;
      background: #f8fafc;
      border-right: 4px solid #12A889;
      padding: 5px 10px;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Grid & Tables */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9.5pt;
    }

    .info-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: bold;
      text-align: right;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      width: 25%;
    }

    .info-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      width: 25%;
    }

    /* Clauses */
    .clauses-container {
      margin-top: 8px;
    }

    .clause-item {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 10px;
      padding: 8px 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .clause-header {
      font-weight: bold;
      font-size: 10pt;
      color: #16324F;
      margin-bottom: 4px;
    }

    .clause-text {
      font-size: 9.5pt;
      color: #334155;
      text-align: justify;
      margin: 0;
    }

    /* Signatures Section */
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .signatures-table td {
      width: 50%;
      vertical-align: top;
      padding: 8px;
    }

    .sig-box {
      border: 1.5px dashed #94a3b8;
      border-radius: 8px;
      padding: 10px;
      background: #fafafa;
      text-align: center;
    }

    .sig-box-signed {
      border: 1.5px solid #12A889;
      background: #f0fdf9;
    }

    .sig-title {
      font-weight: bold;
      font-size: 10pt;
      color: #16324F;
      margin-bottom: 4px;
    }

    .sig-meta {
      font-size: 8.5pt;
      color: #475569;
      margin-bottom: 6px;
    }

    .sig-status-signed {
      color: #0d705b;
      font-weight: bold;
      font-size: 9pt;
      display: inline-block;
      padding: 3px 10px;
      background: #d1fae5;
      border-radius: 9999px;
      margin-top: 4px;
    }

    .sig-status-pending {
      color: #94a3b8;
      font-size: 8.5pt;
      margin-top: 16px;
      font-style: italic;
    }

    /* Official Footer */
    .official-footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8pt;
      color: #64748b;
      page-break-inside: avoid;
    }

    .official-seal {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #16324F;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="contract-page">
    <div class="watermark">منصة دلنّي العقارية - وثيقة رسمية</div>

    <!-- Official Header Table -->
    <table class="header-table">
      <tr>
        <td style="width: 32%;">
          <div class="brand-box">
            <!-- Dalani SVG Vector Logo -->
            <svg width="44" height="44" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 24 162 L 24 72 L 95 14 L 140 44 C 172 70 192 100 192 130 C 192 165 166 186 112 186 C 142 180 170 156 170 128 C 170 102 152 76 128 58 L 95 34 L 44 74 L 44 156 Z" fill="#16324F"/>
              <path d="M 52 76 L 88 46 L 134 78 L 124 86 L 88 56 L 60 84 Z" fill="#16324F"/>
              <polygon points="63,90 81,78 81,146 63,146" fill="#16324F"/>
              <polygon points="88,64 108,78 108,136 88,136" fill="#16324F"/>
              <path d="M 108 186 C 146 186 182 162 186 124 C 188 100 174 74 152 56 C 170 76 174 102 172 124 C 168 152 140 176 108 186 Z" fill="#16324F"/>
              <path d="M 40 186 C 65 182 86 168 110 150 C 130 136 141 125 144 122 C 137 127 120 144 96 162 C 73 178 56 184 40 186 Z" fill="#12A889"/>
              <path d="M 144 97 C 138.5 97 134 101.5 134 107 C 134 113.5 141.5 122 144 125 C 146.5 122 154 113.5 154 107 C 154 101.5 149.5 97 144 97 Z" fill="#12A889"/>
              <circle cx="144" cy="107" r="3.2" fill="#FFFFFF"/>
            </svg>
            <div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <span class="brand-name">دلنّـي</span>
                <span class="brand-badge">اليمن</span>
              </div>
              <div class="brand-sub">منظومة التوثيق العقاري الرقمي</div>
            </div>
          </div>
        </td>

        <td style="width: 36%;">
          <div class="header-title-box">
            <div class="country-title">الجمهورية اليمنية</div>
            <div class="main-doc-title">${contractTitle}</div>
            <div class="doc-subtitle">موثق ومعتمد رسمياً وفق أحكام القانون اليمني النافذ</div>
          </div>
        </td>

        <td style="width: 32%;">
          <div class="meta-box">
            <div>رقم العقد: <span class="meta-pill">${contract.contractNumber}</span></div>
            <div>الحالة: <span class="status-badge">${statusLabel}</span></div>
            <div style="margin-top: 4px;">تاريخ التحرير: <strong>${creationDate}</strong></div>
            <div style="margin-top: 4px;">${generateSvgBarcode(contract.contractNumber)}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- 1. Property Details -->
    <div class="section-title">
      <span>أولاً: بيانات ومعالم العقار موضوع التعاقد</span>
      <span style="font-size: 8.5pt; color: #64748b; font-weight: normal;">رقم الإعلان: ${contract.listingNumber || contract.listingId || 'معتمد'}</span>
    </div>

    <table class="info-table">
      <tr>
        <th>عنوان العقار</th>
        <td>${contract.propertySnapshot?.title || contract.listingTitle || 'عقار رسمي مسجل'}</td>
        <th>نوع العقار والغرض</th>
        <td>${contract.propertySnapshot?.propertyType || 'عقار سكني / تجاري'} (${isSale ? 'بيع وتمليك' : 'إيجار'})</td>
      </tr>
      <tr>
        <th>المحافظة والمدينة</th>
        <td>${contract.propertySnapshot?.governorate || 'الجمهورية اليمنية'} - ${contract.propertySnapshot?.city || ''}</td>
        <th>المديرية والحي</th>
        <td>${contract.propertySnapshot?.district || 'محدد بالعقد'}</td>
      </tr>
      <tr>
        <th>المساحة والمعالم</th>
        <td colspan="3">${contract.propertySnapshot?.area || ''} ${contract.propertySnapshot?.areaUnit || 'لبنة'} • ${contract.propertySnapshot?.street || 'حسب المخطط والموقع المعاين على الطبيعة'}</td>
      </tr>
    </table>

    <!-- 2. Parties Details -->
    <div class="section-title">
      <span>ثانياً: أطراف التعاقد والأهلية القانونية</span>
    </div>

    <table class="info-table">
      <tr>
        <th style="background: #eef2f6; color: #16324F;" colspan="2">الطرف الأول (${isSale ? 'البائع / المالك' : 'المؤجر / صاحب العقار'})</th>
        <th style="background: #eef2f6; color: #16324F;" colspan="2">الطرف الثاني (${isSale ? 'المشتري / المتملك' : 'المستأجر'})</th>
      </tr>
      <tr>
        <th>الاسم الكامل</th>
        <td><strong>${contract.firstParty.name}</strong></td>
        <th>الاسم الكامل</th>
        <td><strong>${contract.secondParty.name}</strong></td>
      </tr>
      <tr>
        <th>رقم الهوية / الجواز</th>
        <td>${contract.firstParty.nationalIdOrPassport || 'مسجل إلكترونياً'}</td>
        <th>رقم الهوية / الجواز</th>
        <td>${contract.secondParty.nationalIdOrPassport || 'مسجل إلكترونياً'}</td>
      </tr>
      <tr>
        <th>رقم الهاتف</th>
        <td>${contract.firstParty.phone || 'معتمد بالمنصة'}</td>
        <th>رقم الهاتف</th>
        <td>${contract.secondParty.phone || 'معتمد بالمنصة'}</td>
      </tr>
      <tr>
        <th>حالة التوثيق</th>
        <td>${contract.firstParty.signatureStatus === 'signed' ? 'موقع رسمياً' : 'بانتظار التوقيع'}</td>
        <th>حالة التوثيق</th>
        <td>${contract.secondParty.signatureStatus === 'signed' ? 'موقع رسمياً' : 'بانتظار التوقيع'}</td>
      </tr>
    </table>

    <!-- 3. Financial Terms -->
    <div class="section-title">
      <span>ثالثاً: الشروط والالتزامات المالية</span>
    </div>

    <table class="info-table">
      <tr>
        <th>المبلغ الإجمالي المتفق عليه</th>
        <td style="font-size: 11pt; font-weight: bold; color: #16324F;">${formattedTotal} ${currencySymbol}</td>
        <th>مبلغ العربون / المقدم</th>
        <td style="font-weight: bold; color: #0d705b;">${formattedDeposit} ${currencySymbol}</td>
      </tr>
      <tr>
        <th>آلية وجدولة السداد</th>
        <td>${contract.financialTerms.paymentSchedule || 'وفق الاتفاق المبرم بين الطرفين'}</td>
        <th>موعد التسليم وحيازة العقار</th>
        <td>${contract.durationTerms?.handoverDate || 'عند استيفاء الالتزامات'}</td>
      </tr>
      ${contract.notes ? `
      <tr>
        <th>ملاحظات وشروط خاصة</th>
        <td colspan="3">${contract.notes}</td>
      </tr>` : ''}
    </table>

    <!-- 4. Contract Clauses -->
    <div class="section-title">
      <span>رابعاً: البنود والأحكام التعاقدية القانونية الملزمة</span>
      <span style="font-size: 8.5pt; color: #64748b; font-weight: normal;">إجمالي المواد: ${contract.clauses.length}</span>
    </div>

    <div class="clauses-container">
      ${contract.clauses
        .map(
          c => `
        <div class="clause-item">
          <div class="clause-header">المادة (${c.number}): ${c.title}</div>
          <p class="clause-text">${c.content}</p>
        </div>
      `
        )
        .join('')}
    </div>

    <!-- 5. Signatures and Endorsement -->
    <table class="signatures-table">
      <tr>
        <td>
          <div class="sig-box ${contract.firstParty.signatureStatus === 'signed' ? 'sig-box-signed' : ''}">
            <div class="sig-title">توقيع ومصادقة الطرف الأول</div>
            <div class="sig-meta">${contract.firstParty.name} (${isSale ? 'البائع' : 'المؤجر'})</div>
            ${
              contract.firstParty.signatureStatus === 'signed'
                ? `
                <div class="sig-status-signed">موقع إلكترونياً بالبصمة الرقمية</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">بتاريخ: ${contract.firstParty.signedAt || creationDate}</div>
                <div style="font-family: monospace; font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">ID: ${contract.firstParty.nationalIdOrPassport || 'VERIFIED'}</div>
              `
                : '<div class="sig-status-pending">بانتظار إتمام التوقيع الإلكتروني الرسمي</div>'
            }
          </div>
        </td>

        <td>
          <div class="sig-box ${contract.secondParty.signatureStatus === 'signed' ? 'sig-box-signed' : ''}">
            <div class="sig-title">توقيع ومصادقة الطرف الثاني</div>
            <div class="sig-meta">${contract.secondParty.name} (${isSale ? 'المشتري' : 'المستأجر'})</div>
            ${
              contract.secondParty.signatureStatus === 'signed'
                ? `
                <div class="sig-status-signed">موقع إلكترونياً بالبصمة الرقمية</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">بتاريخ: ${contract.secondParty.signedAt || creationDate}</div>
                <div style="font-family: monospace; font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">ID: ${contract.secondParty.nationalIdOrPassport || 'VERIFIED'}</div>
              `
                : '<div class="sig-status-pending">بانتظار إتمام التوقيع الإلكتروني الرسمي</div>'
            }
          </div>
        </td>
      </tr>
    </table>

    <!-- Official Stamp Footer -->
    <div class="official-footer">
      <div class="official-seal">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12A889" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span>وثيقة صادرة وموثقة إلكترونياً عبر منصة دلنّي العقارية - الرقم المرجعي: ${contract.contractNumber}</span>
      </div>
      <div>الصفحة 1 من 1 • صالحة للتعامل الرسمي والقانوني</div>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Universal print invocation
 * 1. If running inside Android Capacitor app, calls native Android PrintManager via JavascriptInterface
 * 2. If running in web browser or desktop, opens clean print preview via an isolated iframe
 */
export const printContractDocument = async (
  contract: PropertyContract
): Promise<{ success: boolean; method: 'android_native' | 'iframe_web'; error?: string }> => {
  try {
    const jobTitle = `عقد_${contract.contractNumber}_${contract.firstParty.name}_${contract.secondParty.name}`.replace(/\s+/g, '_');
    const htmlContent = generateContractPrintHtml(contract);

    // 1. Android Native App Bridge
    if (typeof window !== 'undefined' && window.AndroidPrinter && typeof window.AndroidPrinter.printDocument === 'function') {
      window.AndroidPrinter.printDocument(jobTitle, htmlContent);
      return { success: true, method: 'android_native' };
    }

    // 2. Browser Environment Fallback via Hidden Iframe (avoiding UI pollution)
    return new Promise((resolve) => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.id = 'dalani-print-isolated-iframe';

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!iframeDoc) {
          window.print();
          resolve({ success: true, method: 'iframe_web' });
          return;
        }

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Give styles and images a moment to calculate before invoking print
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            resolve({ success: true, method: 'iframe_web' });
          } catch {
            window.print();
            resolve({ success: true, method: 'iframe_web' });
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 3000);
          }
        }, 350);
      } catch (iframeErr) {
        window.print();
        resolve({ success: true, method: 'iframe_web' });
      }
    });
  } catch (err: any) {
    console.error('Error during print invocation:', err);
    return { success: false, method: 'iframe_web', error: err?.message || 'Print failed' };
  }
};
