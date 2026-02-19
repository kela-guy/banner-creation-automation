/**
 * Structured Avatar (persona) document template.
 * Aligns with Extract prompt: pain points, desires, USPs.
 * Used for "Start from template" and "Download template" in the Upload panel.
 */

import type { Locale } from "@/lib/translations";

export const AVATAR_TEMPLATE_EN = `# Avatar / Persona document

## Who is your ideal customer?
Describe your target audience in 1–2 sentences: age, situation, and what they care about.

Example: Women 40–55 who struggle with energy and want natural solutions without side effects.

---

## Pain points (3–5)
List the main problems, frustrations, or objections your customer has. Be specific.

- 
- 
- 

---

## Desires & goals (2–4)
What do they want to achieve? What outcome would make them buy?

- 
- 

---

## Unique selling propositions (2–3)
What makes your offer different? Key benefits or proof points.

- 
- 

---

## Language & tone (optional)
How should we speak to them? (e.g. warm and supportive, expert and direct, casual Hebrew)

---

## Common objections (optional)
What might hold them back? (e.g. price, skepticism, time)
`;

export const AVATAR_TEMPLATE_HE = `# מסמך אווטאר / פרסונה

## מי הלקוח האידיאלי שלך?
תאר את קהל היעד במשפט או שניים: גיל, מצב, ומה חשוב להם.

דוגמה: נשים 40–55 שמתמודדות עם חוסר אנרגיה ורוצות פתרונות טבעיים בלי תופעות לוואי.

---

## נקודות כאב (3–5)
פרט את הבעיות, התסכולים או ההתנגדות העיקריים של הלקוח. היו ספציפיים.

- 
- 
- 

---

## רצונות ומטרות (2–4)
מה הם רוצים להשיג? איזה תוצאה תגרום להם לרכוש?

- 
- 

---

## יתרונות ייחודיים (2–3)
מה מייחד את ההצעה שלך? יתרונות מרכזיים או הוכחות.

- 
- 

---

## שפה וטון (אופציונלי)
איך לדבר איתם? (למשל חם ותומך, מומחה וישיר, עברית קלילה)

---

## התנגדויות נפוצות (אופציונלי)
מה עלול לעצור אותם? (מחיר, סקפטיות, זמן)
`;

export function getAvatarTemplate(locale: Locale): string {
  return locale === "he" ? AVATAR_TEMPLATE_HE : AVATAR_TEMPLATE_EN;
}

export function downloadAvatarTemplate(locale: Locale): void {
  const text = getAvatarTemplate(locale);
  const filename = locale === "he" ? "avatar-template.txt" : "avatar-template.txt";
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
