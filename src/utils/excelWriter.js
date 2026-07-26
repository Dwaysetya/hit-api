import * as XLSX from 'xlsx';

export const writeExcel = (data, filename = 'Execution_Result.xlsx') => {
  try {
    // data should be an array of objects matching: { No, ODP, Status, Message, Timestamp }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    // Trigger download
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Failed to write excel:', error);
  }
};
