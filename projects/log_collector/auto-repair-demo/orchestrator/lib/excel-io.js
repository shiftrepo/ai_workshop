const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const COLS = {
  id: 1, trackId: 2, ts: 3, summary: 4, assignee: 5, status: 6, note: 7,
  collect_summary: 8, analysis: 9, repair_plan: 10,
  approver: 11, pr_url: 12, updated: 13,
};

let queue = Promise.resolve();
function serialize(fn) {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

async function loadWorkbook(xlsxPath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  return wb;
}

async function saveWorkbook(xlsxPath, wb) {
  const tmp = xlsxPath + '.tmp';
  await wb.xlsx.writeFile(tmp);
  fs.renameSync(tmp, xlsxPath);
}

function extractTrackId(text) {
  if (!text) return null;
  const m = String(text).match(/TrackID[:\s]*([A-Z0-9]{3,10})/i);
  return m ? m[1] : null;
}

function readRows(xlsxPath) {
  return serialize(async () => {
    const wb = await loadWorkbook(xlsxPath);
    const ws = wb.worksheets[0];
    const rows = [];
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const cell = (i) => {
        const v = row.getCell(i).value;
        if (v && typeof v === 'object' && 'text' in v) return v.text;
        if (v && typeof v === 'object' && 'result' in v) return v.result;
        return v;
      };
      const summary = cell(COLS.summary);
      rows.push({
        rowNum,
        id: cell(COLS.id),
        ts: cell(COLS.ts),
        summary,
        trackId: cell(COLS.trackId) || extractTrackId(summary),
        assignee: cell(COLS.assignee),
        status: cell(COLS.status),
        note: cell(COLS.note),
        collect_summary: cell(COLS.collect_summary),
        analysis: cell(COLS.analysis),
        repair_plan: cell(COLS.repair_plan),
        approver: cell(COLS.approver),
        pr_url: cell(COLS.pr_url),
        updated: cell(COLS.updated),
      });
    });
    return rows;
  });
}

async function updateRow(xlsxPath, rowNum, updates) {
  return serialize(async () => {
    const wb = await loadWorkbook(xlsxPath);
    const ws = wb.worksheets[0];
    const row = ws.getRow(rowNum);
    for (const [key, value] of Object.entries(updates)) {
      if (COLS[key] == null) continue;
      row.getCell(COLS[key]).value = value;
    }
    row.getCell(COLS.updated).value = new Date().toISOString();
    row.commit();
    await saveWorkbook(xlsxPath, wb);
  });
}

module.exports = { readRows, updateRow, COLS, extractTrackId };
