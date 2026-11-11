import { Injectable } from '@angular/core';
import { remult } from 'remult';
import { ReminderType } from '../../shared/entity';

/**
 * שלב ג׳ 7.4 - סוגי התזכורת לקליינט: רשימה, שם לפי קוד, הוספה ושינוי שם.
 * מקור אחד לרשימה, לחלון התזכורת ולשורת הסינון. הכללים (ניקוי, כפילות,
 * קוד אוטומטי) יושבים ביישות ורצים בשרת.
 */
@Injectable({
  providedIn: 'root'
})
export class ReminderTypeService {
  private repo = remult.repo(ReminderType);
  private loading?: Promise<ReminderType[]>;
  /** הסוגים הפעילים, בסדר המיון. */
  types: ReminderType[] = [];

  load(force = false): Promise<ReminderType[]> {
    if (!this.loading || force) {
      this.loading = this.repo.find({ where: { isActive: true } }).then(rows => this.types = rows);
    }
    return this.loading;
  }

  /** השם להצגה. קוד שאינו בקטלוג - מוצג הקוד עצמו. */
  label(code: string | undefined): string {
    if (!code) return '';
    return this.types.find(t => t.code === code)?.name || code;
  }

  /** סוג חדש - מקבל קוד אוטומטי בשרת, ונכנס בסוף הרשימה. */
  async add(name: string): Promise<ReminderType> {
    const sortOrder = Math.max(0, ...this.types.map(t => t.sortOrder || 0)) + 1;
    const created = await this.repo.save(this.repo.create({ name, sortOrder }));
    await this.load(true);
    return created;
  }

  /** תיקון שם - מתעדכן בכל התזכורות מהסוג הזה, כי הן שומרות רק את הקוד. */
  async rename(code: string, name: string): Promise<void> {
    const type = await this.repo.findFirst({ code });
    if (!type) return;
    type.name = name;
    await this.repo.save(type);
    await this.load(true);
  }
}
