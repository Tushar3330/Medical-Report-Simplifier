// Serve index.html for non-API routes
const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
  try {
    const filePath = path.join(__dirname, '../public/index.html');
    const html = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(404).send('Page not found');
  }
};