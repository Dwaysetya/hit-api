import * as XLSX from 'xlsx';

export const readExcel = (file) => {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    
    if (extension === 'txt') {
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const odpList = text.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          if (odpList.length === 0) {
            throw new Error('Text file is empty');
          }
          resolve(odpList);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    } else {
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
            throw new Error('File is empty');
          }

          // Find the index of "odp_name" column (case-insensitive)
          const headers = jsonData[0] || [];
          let odpIndex = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().trim() === 'odp_name');
          let startIndex = 1;

          if (odpIndex === -1) {
            // Fallback: assume first column if no "odp_name" header is found
            odpIndex = 0;
            startIndex = 0;
          }

          const odpList = [];
          for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row[odpIndex]) {
              odpList.push(String(row[odpIndex]).trim());
            }
          }
          
          if (odpList.length === 0) {
            throw new Error('No ODP data found in file');
          }
          
          resolve(odpList);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    }
  });
};
