const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static static web assets
app.use(express.static(__dirname));

// Default fallback to single-page application entry point
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Arcade server operating at http://localhost:${PORT}`);
});