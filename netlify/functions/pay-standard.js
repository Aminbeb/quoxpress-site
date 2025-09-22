// netlify/functions/pay-standard.js
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const TOYYIB_SECRET = process.env.TOYYIB_SECRET;
  const TOYYIB_CAT    = process.env.TOYYIB_CATEGORY;
  const RETURN_URL    = process.env.RETURN_URL || 'https://quoxpress.netlify.app/sales/?paid=1';
  const CALLBACK_URL  = process.env.CALLBACK_URL || 'https://quoxpress.netlify.app/.netlify/functions/toyyib-callback';

  if (!TOYYIB_SECRET || !TOYYIB_CAT) {
    console.error('Missing ENV', { TOYYIB_SECRET: !!TOYYIB_SECRET, TOYYIB_CAT: !!TOYYIB_CAT });
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:'Missing ToyyibPay ENV' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    body = {};
  }

  const { coupon = '', email = '', phone = '', name = '' } = body;

  const BASE   = 14900; // RM149.00 dalam sen
  const amount = (String(coupon).toUpperCase() === 'TES20') ? Math.round(BASE * 0.8) : BASE;

  const params = new URLSearchParams({
    userSecretKey: TOYYIB_SECRET,
    categoryCode:  TOYYIB_CAT,
    billName: 'QuoXpress Standard (Tahunan)',
    billDescription: (String(coupon).toUpperCase() === 'TES20') ?
      'Standard (20% Testimoni)' : 'Standard (Tahunan)',
    billAmount: String(amount),
    billReturnUrl: RETURN_URL,
    billCallbackUrl: CALLBACK_URL,
    billTo: name, billEmail: email, billPhone: phone,
    billPayorInfo: '1',
    billExternalReferenceNo: `QXSTD-${Date.now()}`
  });

  try {
    const resp = await fetch('https://toyyibpay.com/index.php/api/createBill', {
      method: 'POST',
      headers: { 'Content-Type':'application/x-www-form-urlencoded' },
      body: params
    });

    // ToyyibPay kadang-kadang balas JSON (array), kadang text
    let data, text;
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await resp.json();
    } else {
      text = await resp.text();
      try { data = JSON.parse(text); } catch { /* biar data kekal undefined */ }
    }

    // Cuba baca BillCode
    const billCode =
      (Array.isArray(data) && data[0]?.BillCode) ||
      (data?.BillCode) || null;

    if (!billCode) {
      console.error('ToyyibPay no BillCode', { status: resp.status, data, text });
      return {
        statusCode: 502,
        body: JSON.stringify({ ok:false, data, text, status: resp.status })
      };
    }

    const billUrl = `https://toyyibpay.com/${billCode}`;
    return { statusCode: 200, body: JSON.stringify({ ok:true, billUrl, amount }) };

  } catch (err) {
    console.error('ToyyibPay fetch error', err);
    return { statusCode: 502, body: JSON.stringify({ ok:false, error: String(err) }) };
  }
}
