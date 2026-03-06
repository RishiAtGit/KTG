const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const data = [
    {
        "Name": "Example Item 1",
        "Rate": 500,
        "Stock": 10,
        "Piece Price": "",
        "Piece Weight (g)": "",
        "Track Stock": "TRUE"
    },
    {
        "Name": "Example Piece Item",
        "Rate": 400,
        "Stock": 5,
        "Piece Price": 15,
        "Piece Weight (g)": 50,
        "Track Stock": "TRUE"
    },
    {
        "Name": "Example Packaging (No Track)",
        "Rate": 0,
        "Stock": 0,
        "Piece Price": 10,
        "Piece Weight (g)": "",
        "Track Stock": "FALSE"
    }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');

const outputPath = path.join(__dirname, 'Bulk_Upload_Template.xlsx');
XLSX.writeFile(wb, outputPath);
console.log('Successfully written template to: ' + outputPath);
