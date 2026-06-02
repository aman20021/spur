import db from '../db/index.js';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export function getAllKnowledge(): FAQ[] {
  return db.prepare('SELECT * FROM faq_knowledge ORDER BY category').all() as FAQ[];
}

export function buildKnowledgeContext(): string {
  const faqs = getAllKnowledge();

  if (faqs.length === 0) {
    return `STORE INFO:
- Name: SparkStore
- Type: E-commerce (electronics, fashion, home & living)
- Shipping: Free over ₹999, express available
- Returns: 30-day hassle-free
- Support: Mon-Sat 9AM-9PM IST
- Payment: Cards, UPI, Net Banking, COD`;
  }

  const grouped = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  let context = 'STORE KNOWLEDGE BASE:\n\n';
  for (const [category, items] of Object.entries(grouped)) {
    context += `[${category.toUpperCase()}]\n`;
    for (const item of items) {
      context += `Q: ${item.question}\nA: ${item.answer}\n\n`;
    }
  }

  return context;
}
