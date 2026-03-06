fetch('http://localhost:3000/api/items/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ add_stock_kg: 5.5 })
})
    .then(r => r.json())
    .then(data => console.log('Response:', data))
    .catch(err => console.error('Error:', err));
