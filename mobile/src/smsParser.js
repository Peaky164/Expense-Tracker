// Reads a bank SMS and guesses amount, type, date and description.
// Returns null if the message is not understood.

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Date-only SMS has no time, so use 12:00 noon (keeps the right day after UTC conversion).
// If that is in the future (today's SMS), use the current time instead.
function buildDate(year, month, day) {
  if (year < 100) year += 2000;
  const noon = new Date(year, month, day, 12, 0, 0);
  if (noon.getMonth() !== month || noon.getDate() !== day) return null; // not a real date
  const now = new Date();
  return (noon > now ? now : noon).toISOString();
}

function findDate(text) {
  let m;
  const numeric = /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4}|\d{2})\b/g; // 06/11/2026
  while ((m = numeric.exec(text))) {
    const d = buildDate(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (d) return d;
  }
  const named = /\b(\d{1,2})[\s-]?([A-Za-z]{3})[\s-]?(\d{4}|\d{2})\b/g; // 08Nov26
  while ((m = named.exec(text))) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month === undefined) continue;
    const d = buildDate(Number(m[3]), month, Number(m[1]));
    if (d) return d;
  }
  return null;
}

function findType(text) {
  const e = text.search(/\b(debited|withdrawn|spent|paid|purchase|sent)\b/i);
  const i = text.search(/\b(credited|received|deposited)\b/i);
  if (e === -1 && i === -1) return null;
  if (e === -1) return 'income';
  if (i === -1) return 'expense';
  return e < i ? 'expense' : 'income';
}

function findAmount(text) {
  // Ignore everything from "Available Balance" onwards
  const main = text.split(/avail(?:able)?\.?\s*bal/i)[0];
  let m = main.match(/(?:\bRs\.?|\bINR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!m) m = main.match(/\b(?:debited|credited)\s+by\s+([\d,]+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const value = parseFloat(m[1].replace(/,/g, ''));
  return value > 0 ? value : null;
}

function findDescription(text, type) {
  let m = text.match(/\btrf to\s+(.+?)\s+Ref/i); // UPI: "trf to Noble Medical S Refno"
  if (m) return m[1].trim();
  m = text.match(/\bUTR\s*\S+\s+by\s+(.+?)\s*,\s*INFO/i); // NEFT sender
  if (!m) m = text.match(/\bby\s+(.+?)\s*,\s*INFO/i);
  if (m) return m[1].trim();
  if (type === 'expense' && /\bATM\b/i.test(text)) return 'ATM withdrawal';
  return 'Bank SMS';
}

export function parseSms(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  const type = findType(text);
  const amount = findAmount(text);
  if (!type || amount === null) return null;

  let paymentMode = null;
  if (/\bUPI\b/i.test(text)) paymentMode = 'UPI';
  else if (/\bATM\b/i.test(text)) paymentMode = 'Cash';

  return {
    amount,
    type, // 'expense' or 'income'
    date: findDate(text), // ISO string, or null if no date found
    description: findDescription(text, type).slice(0, 60),
    paymentMode, // 'UPI', 'Cash' or null
  };
}