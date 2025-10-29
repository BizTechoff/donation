const fs = require('fs');

// Read the analysis
const letters = JSON.parse(fs.readFileSync('letters-analysis.json', 'utf8'));

// Clean fields - remove GUIDs, XML, and malformed data
function cleanFields(fields) {
  return fields.filter(field => {
    // Remove GUIDs
    if (/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(field)) {
      return false;
    }
    // Remove XML/HTML content
    if (field.includes('<') || field.includes('>') || field.includes('w:') || field.length > 100) {
      return false;
    }
    return true;
  });
}

// Generate TypeScript code
let tsCode = `import { ValueListFieldType } from "remult";

@ValueListFieldType<LetterRenew>({ caption: 'סוג מכתב מחודש' })
export class LetterRenew {

`;

const letterInstances = [];

letters.forEach((letter, index) => {
  const cleanedFields = cleanFields(letter.fields);

  // Hebrew to English transliteration map
  const hebrewToEnglish = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
    'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
    'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'ף': 'p',
    'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't'
  };

  function transliterate(text) {
    return text.split('').map(char => hebrewToEnglish[char] || char).join('');
  }

  // Generate a safe variable name
  const fileName = letter.file.replace(/\.docx$/i, '').replace(/ /g, '_').replace(/\./g, '_');
  const fileNameEn = transliterate(fileName);
  const pathParts = letter.path.split('\\');
  const category = pathParts[0];
  const subcat = pathParts.length > 2 ? pathParts[1] : '';

  // Generate variable name
  let varName = `letter_`;
  if (category === 'אמריקה') {
    varName += 'america_' + fileNameEn;
  } else if (category === 'ניחום אבלים') {
    varName += 'condolence_' + fileNameEn;
  } else if (category === 'שמחות') {
    if (subcat === 'אירוסין') varName += 'engagement_' + fileNameEn;
    else if (subcat === 'בן') varName += 'son_' + fileNameEn;
    else if (subcat === 'בת') varName += 'daughter_' + fileNameEn;
    else if (subcat === 'בר מצוה') varName += 'barmitzvah_' + fileNameEn;
    else if (subcat === 'נישואין') varName += 'wedding_' + fileNameEn;
    else if (subcat === 'ספר תורה') varName += 'sefertorah_' + fileNameEn;
    else if (subcat === 'שונות') varName += 'other_' + fileNameEn;
    else if (subcat === 'תאומים') varName += 'twins_' + fileNameEn;
    else varName += 'simcha_' + fileNameEn;
  } else if (category === 'תרומות') {
    varName += 'donation_' + fileNameEn;
  } else {
    varName += fileNameEn;
  }

  // Replace special chars with underscore and convert to lowercase
  varName = varName.replace(/[^\w]/g, '_').toLowerCase().replace(/_+/g, '_');

  const caption = letter.path.replace(/\\/g, ' / ').replace('.docx', '');
  const path = letter.path.replace(/\\/g, '/');

  letterInstances.push(varName);

  tsCode += `  static ${varName} = new LetterRenew('${caption}', '${path}', [
`;

  cleanedFields.forEach((field, i) => {
    tsCode += `    '${field}'`;
    if (i < cleanedFields.length - 1) {
      tsCode += ',\n';
    } else {
      tsCode += '\n';
    }
  });

  tsCode += `  ])
`;
});

// Add constructor and methods
tsCode += `
  constructor(
    public caption = '',
    public templatePath = '',
    public fields = [] as string[]
  ) {
    this.caption = caption;
    this.templatePath = templatePath;
  }

  public id = ''; // should be the variable name like 'letter_donation_מכתב_תודה_רגיל'

  static getFields() {
    const result = [
`;

letterInstances.forEach((name, i) => {
  tsCode += `      this.${name}`;
  if (i < letterInstances.length - 1) {
    tsCode += ',\n';
  } else {
    tsCode += '\n';
  }
});

tsCode += `    ]
    return result
  }

  static fromString(typeId = '') {
    var result = LetterRenew.${letterInstances[0]}
    if (typeId?.trim().length) {
      const found = LetterRenew.getFields().find((type) => type.id === typeId);
      if (found) {
        result = found
      }
    }
    return result
  }

}
`;

// Write the TypeScript file
fs.writeFileSync('src/shared/enum/letter.renew.ts', tsCode);

console.log(`\\n✅ Generated letter.renew.ts with ${letters.length} letter templates`);
console.log(`📁 File: src/shared/enum/letter.renew.ts`);
