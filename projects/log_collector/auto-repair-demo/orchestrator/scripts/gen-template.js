#!/usr/bin/env node
const path = require('path');
const ExcelJS = require('exceljs');

const HEADERS = [
  { header: 'インシデントID', width: 12 },
  { header: 'タイムスタンプ', width: 22 },
  { header: 'インシデント概要', width: 60 },
  { header: '担当者', width: 14 },
  { header: 'ステータス', width: 16 },
  { header: '調査状況', width: 40 },
  { header: '収集ログサマリ', width: 40 },
  { header: '一次解析結果', width: 60 },
  { header: '改修案', width: 60 },
  { header: '承認者', width: 14 },
  { header: 'PR URL', width: 40 },
  { header: '最終更新', width: 22 },
];

const OUT = path.join(__dirname, '..', '..', 'examples', 'incident_management_template.xlsx');

(async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('incidents');
  ws.columns = HEADERS;
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDDDDD' },
  };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'L1' };
  await wb.xlsx.writeFile(OUT);
  console.log(`wrote ${OUT}`);
})();
