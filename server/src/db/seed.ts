import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { migrate } from './migrate.js';

const FAQ_DATA = [
  {
    category: 'shipping',
    question: 'What are your shipping options?',
    answer: 'We offer Standard Shipping (5-7 business days, free on orders over ₹999), Express Shipping (2-3 business days, ₹149), and Same-Day Delivery (available in Delhi NCR, Mumbai, Bangalore for ₹299). All orders include tracking.'
  },
  {
    category: 'shipping',
    question: 'Do you ship internationally?',
    answer: 'Yes! We ship to USA, UK, Canada, Australia, and UAE. International shipping takes 7-14 business days and costs ₹499-₹999 depending on weight. Free international shipping on orders over ₹4999.'
  },
  {
    category: 'returns',
    question: 'What is your return policy?',
    answer: 'We offer a 30-day hassle-free return policy. Items must be unused and in original packaging. Refunds are processed within 5-7 business days after we receive the return. Return shipping is free for defective items; otherwise ₹99 is deducted.'
  },
  {
    category: 'returns',
    question: 'How do I initiate a return?',
    answer: 'Go to My Orders → select the order → click "Return Item". Choose your reason and schedule a pickup. Our delivery partner will collect it within 2 business days. You\'ll receive email updates at each step.'
  },
  {
    category: 'payments',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit/debit cards (Visa, Mastercard, RuPay), UPI (GPay, PhonePe, Paytm), Net Banking, Wallets, and Cash on Delivery (₹49 fee). EMI available on orders above ₹3000 via select banks.'
  },
  {
    category: 'payments',
    question: 'Is my payment information secure?',
    answer: 'Absolutely. We use Razorpay for payment processing with 256-bit SSL encryption. We never store your card details on our servers. All transactions are PCI-DSS compliant.'
  },
  {
    category: 'support',
    question: 'What are your support hours?',
    answer: 'Our support team is available Monday-Saturday, 9 AM to 9 PM IST. You can reach us via live chat (fastest, avg response 2 min), email at support@sparkstore.in (response within 4 hours), or phone at 1800-123-4567 (toll-free).'
  },
  {
    category: 'support',
    question: 'I have an issue with my order',
    answer: 'I\'m sorry to hear that! Please share your order number (starts with #SPK) and I\'ll look into it right away. Common issues I can help with: tracking updates, delivery delays, wrong item received, or damaged products.'
  },
  {
    category: 'products',
    question: 'Do you have a warranty?',
    answer: 'Electronics come with a 1-year manufacturer warranty. Fashion items have a 6-month quality guarantee against manufacturing defects. Home & Living products have a 90-day guarantee. Extended warranty available at checkout for electronics.'
  },
  {
    category: 'products',
    question: 'Are your products authentic?',
    answer: 'Yes, 100% authentic. We source directly from brands or authorized distributors. Every product comes with a brand warranty card and original packaging. If you receive anything you suspect is not genuine, we\'ll refund 200% of the purchase price.'
  }
];

function seed() {
  migrate();

  const db = new Database(config.databasePath);
  db.pragma('journal_mode = WAL');

  const insert = db.prepare(
    'INSERT OR REPLACE INTO faq_knowledge (id, category, question, answer) VALUES (?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (const faq of FAQ_DATA) {
      insert.run(nanoid(12), faq.category, faq.question, faq.answer);
    }
  });

  tx();
  console.log(`[seed] Inserted ${FAQ_DATA.length} FAQ entries`);
  db.close();
}

seed();
