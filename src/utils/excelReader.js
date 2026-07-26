import * as XLSX from 'xlsx';

export const readExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Assume data is in the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array (array of arrays)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          throw new Error('Excel file is empty');
        }

        // Find the index of "odp_name" column (case-insensitive)
        const headers = jsonData[0];
        const odpIndex = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().trim() === 'odp_name');

        if (odpIndex === -1) {
          throw new Error('Column "odp_name" not found in the Excel file');
        }

        const odpList = [];
        // Loop from row 1 (skipping header at row 0)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const odpName = row[odpIndex];
          if (odpName) {
            odpList.push(String(odpName).trim());
          }
        }
        
        resolve(odpList);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
