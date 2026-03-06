const xlsx = require('xlsx');
const ws = xlsx.utils.json_to_sheet([{ Name: 'TestItem1', Rate: 450, Stock: 5 }, { Name: 'TestItem2', Rate: 600, Stock: 10 }]);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Items');
xlsx.writeFile(wb, 'test_inventory.xlsx');
