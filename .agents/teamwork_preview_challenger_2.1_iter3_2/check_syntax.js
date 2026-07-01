const fs = require('fs');
let content = fs.readFileSync('c:\\Users\\ajays\\.gemini\\antigravity\\scratch\\lifemaxxantigrav\\react-app\\src\\lib\\store.js', 'utf8');
content = content.replace(/import .*/g, '');
content = content.replace(/export /g, '');
try {
  new Function(content);
  console.log("Valid JS");
} catch(e) {
  console.error("Syntax Error: " + e.message);
  process.exit(1);
}
