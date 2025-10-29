const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const lettersDir = './src/assets/letters';

async function extractFieldsFromDocx(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);

    // Read document.xml which contains the main content
    const documentXml = await zip.file('word/document.xml').async('string');

    // Find all fields wrapped in curly braces {field_name}
    const fieldRegex = /\{([^}]+)\}/g;
    const fields = [];
    let match;

    while ((match = fieldRegex.exec(documentXml)) !== null) {
      const field = match[1].trim();
      if (!fields.includes(field)) {
        fields.push(field);
      }
    }

    return fields;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return [];
  }
}

async function analyzeAllLetters() {
  const results = [];

  function walkDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.docx') && !file.startsWith('~$')) {
        const relativePath = path.relative(lettersDir, fullPath);
        results.push({ file, path: relativePath, fullPath });
      }
    }
  }

  walkDir(lettersDir);

  // Process each file
  for (const item of results) {
    const fields = await extractFieldsFromDocx(item.fullPath);
    item.fields = fields;

    console.log(`\nFile: ${item.file}`);
    console.log(`Path: ${item.path}`);
    console.log(`Fields: [${fields.map(f => `'${f}'`).join(', ')}]`);
    console.log('---');
  }

  // Output as JSON
  fs.writeFileSync('letters-analysis.json', JSON.stringify(results, null, 2));
  console.log('\n\nAnalysis saved to letters-analysis.json');
}

analyzeAllLetters().catch(console.error);
