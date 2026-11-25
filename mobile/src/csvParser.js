// Reads bank CSV text and returns { rows, skipped }, or null if no header row is found.
// Each row: { date (ISO), description, amount, type ('expense' | 'income') }

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function splitLine(line, delim) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function toRows(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const sample = lines.slice(0, 20).join('\n');
  const delim = [',', ';', '\t']
    .map((d) => [d, sample.split(d).length])
    .sort((a, b) => b[1] - a[1])[0][0];
  return lines.map((l) => splitLine(l, delim));
}

// Date-only values get 12:00 noon; if that is in the future, use the current time.
function toDate(s) {
  s = (s || '').trim();
  let m;
  let y, mo, d;
  if ((m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/))) {
    y = +m[1]; mo = +m[2] - 1; d = +m[3];
  } else if ((m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/))) {
    d = +m[1]; mo = +m[2] - 1; y = +m[3];
  } else if ((m = s.match(/^(\d{1,2})[\s\/-]([A-Za-z]{3})[A-Za-z]*[\s\/,-]*(\d{2,4})/))) {
    d = +m[1]; mo = MONTHS[m[2].toLowerCase()]; y = +m[3];
    if (mo === undefined) return null;
  } else return null;
  if (y < 100) y += 2000;
  const noon = new Date(y, mo, d, 12, 0, 0);
  if (noon.getMonth() !== mo || noon.getDate() !== d) return null;
  const now = new Date();
  return (noon > now ? now : noon).toISOString();
}

function toNumber(s) {
  if (s === undefined || s === null) return null;
  const cleaned = String(s).replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

const norm = (h) => h.toLowerCase().replace(/[^a-z]/g, '');

function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const h = rows[r].map(norm);
    const dateIdxs = h.map((x, i) => (x.includes('date') ? i : -1)).filter((i) => i >= 0);
    if (dateIdxs.length === 0) continue;
    const dateIdx =
      dateIdxs.find((i) => /txn|transaction|posting/.test(h[i])) ?? dateIdxs[0];
    const debitIdx = h.findIndex((x) => /(debit|withdrawal)/.test(x) && !x.includes('balance'));
    const creditIdx = h.findIndex((x) => /(credit|deposit)/.test(x) && !x.includes('balance'));
    const amountIdx = h.findIndex((x) => x.startsWith('amount'));
    if (debitIdx === -1 && creditIdx === -1 && amountIdx === -1) continue;
    return {
      row: r,
      dateIdx,
      debitIdx,
      creditIdx,
      amountIdx,
      typeIdx: h.findIndex((x) => /^(drcr|crdr|type|transactiontype)$/.test(x)),
      descIdx: h.findIndex((x) => /(narration|description|particulars|details|remarks)/.test(x)),
    };
  }
  return null;
}

export function parseCsv(text) {
  if (!text || typeof text !== 'string') return null;
  const all = toRows(text);
  const head = findHeader(all);
  if (!head) return null;

  const rows = [];
  let skipped = 0;
  for (const cells of all.slice(head.row + 1)) {
    const date = toDate(cells[head.dateIdx]);
    let amount = null;
    let type = null;

    if (head.debitIdx !== -1 || head.creditIdx !== -1) {
      const debit = head.debitIdx !== -1 ? toNumber(cells[head.debitIdx]) : null;
      const credit = head.creditIdx !== -1 ? toNumber(cells[head.creditIdx]) : null;
      if (debit && debit > 0) { amount = debit; type = 'expense'; }
      else if (credit && credit > 0) { amount = credit; type = 'income'; }
    } else {
      const value = toNumber(cells[head.amountIdx]);
      if (value !== null && value !== 0) {
        const t = head.typeIdx !== -1 ? (cells[head.typeIdx] || '').trim() : '';
        if (/^(dr|debit|d)\b/i.test(t)) type = 'expense';
        else if (/^(cr|credit|c)\b/i.test(t)) type = 'income';
        else type = value < 0 ? 'expense' : 'income';
        amount = Math.abs(value);
      }
    }

    if (!date || amount === null || type === null) { skipped += 1; continue; }
    const desc = head.descIdx !== -1 ? (cells[head.descIdx] || '').replace(/\s+/g, ' ').trim() : '';
    rows.push({ date, description: (desc || 'Bank statement').slice(0, 60), amount, type });
  }
  return { rows, skipped };
}