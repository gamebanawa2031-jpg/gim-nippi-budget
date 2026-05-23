const xlsx = require('xlsx');

const filePath = 'c:\\EzyBIM\\EzyConversions\\Price list APAC (L-5) Distributor - March,25,2026 - May,06,2026_20260325.xlsx';

try {
  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log('Sheet Names:', sheetNames);

  for (const sheetName of sheetNames) {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Print first 10 rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
      console.log(data[i]);
    }
  }
} catch (error) {
  console.error('Error reading excel file:', error);
}
