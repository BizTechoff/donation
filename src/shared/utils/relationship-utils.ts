// פונקציה להיפוך קשרים משפחתיים
export function getReverseRelationship(relationshipType: string, gender?: 'male' | 'female'): string {
  const isFemale = gender === 'female';

  const relationshipMap: { [key: string]: { male: string; female: string } } = {
    'בן': { male: 'אב', female: 'אם' },
    'בת': { male: 'אב', female: 'אם' },
    'אב': { male: 'בן', female: 'בת' },
    'אם': { male: 'בן', female: 'בת' },
    'נכד': { male: 'סבא', female: 'סבתא' },
    'נכדה': { male: 'סבא', female: 'סבתא' },
    'סבא': { male: 'נכד', female: 'נכדה' },
    'סבתא': { male: 'נכד', female: 'נכדה' },
    'אח': { male: 'אח', female: 'אחות' },
    'אחות': { male: 'אח', female: 'אחות' },
    'דוד': { male: 'אחיין', female: 'אחיינית' },
    'דודה': { male: 'אחיין', female: 'אחיינית' },
    'אחיין': { male: 'דוד', female: 'דודה' },
    'אחיינית': { male: 'דוד', female: 'דודה' },
    'חתן': { male: 'חותן', female: 'חותנת' },
    'כלה': { male: 'חותן', female: 'חותנת' },
    'חותן': { male: 'חתן', female: 'כלה' },
    'חותנת': { male: 'חתן', female: 'כלה' },
    'בעל': { male: '', female: 'אישה' },
    'אישה': { male: 'בעל', female: '' },
    'גיס': { male: 'גיס', female: 'גיסה' },
    'גיסה': { male: 'גיס', female: 'גיסה' },
  };

  const mapping = relationshipMap[relationshipType];
  if (!mapping) {
    // אם אין מיפוי - החזר את הקשר המקורי
    return relationshipType;
  }

  return isFemale ? mapping.female : mapping.male;
}
