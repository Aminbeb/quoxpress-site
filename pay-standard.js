// Netlify Function
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const TOYYIB_SECRET = process.env.TOYYIB_SECRET;
  const TOYYIB_CAT    = process.env.TOYYIB_CATEGORY;
  const RETURN_URL    = process.env.RETURN_URL || 'https://quoxpress.netlify.app/sales/?paid=1';
  const CALLBACK_URL  = process.env.CALLBACK_URL || 'https://quoxpress.netlify.app/.netlify/functions/toyyib-callback';

  if (!TOYYIB_SECRET || !TOYYIB_CAT) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:'Missing env vars' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}
  const { coupon = '', email = '', phone = '', name = '' } = body;

  // === HARGA STANDARD ===
  const BASE = 14900; // RM149.00 dalam sen
  const amount = (String(coupon).toUpperCase() === 'TES20')
    ? Math.round(BASE * 0.8)  // 20% diskaun
    : BASE;

  const params = new URLSearchParams({
    userSecretKey: TOYYIB_SECRET,
    categoryCode: TOYYIB_CAT,
    billName: 'QuoXpress Standard (Tahunan)',
    billDescription: (String(coupon).toUpperCase() === 'TES20')
      ? 'Standard (20% Testimoni)'
      : 'Standard (Tahunan)',
    billAmount: String(amount),
    billReturnUrl: RETURN_URL,
    billCallbackUrl: CALLBACK_URL,
    billTo: name, billEmail: email, billPhone: phone,
    billPayorInfo: '1',
    billExternalReferenceNo: `QXSTD-${Date.now()}`
  });

  const resp = await fetch('https://toyyibpay.com/index.php/api/createBill', {
    method: 'POST',
    headers: { 'Content-Type':'application/x-www-form-urlencoded' },
    body: params
  });

  let data; try { data = await resp.json(); } catch { data = null; }
  const billCode = Array.isArray(data) && data[0]?.BillCode;
  if (!billCode) {
    return { statusCode: 502, body: JSON.stringify({ ok:false, data }) };
  }

  const billUrl = `https://toyyibpay.com/${billCode}`;
  return { statusCode: 200, body: JSON.stringify({ ok:true, billUrl, amount }) };
}
