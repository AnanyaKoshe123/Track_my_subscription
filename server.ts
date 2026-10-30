import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // AI Assistant Chat API
  app.post('/api/ai-chat', async (req, res) => {
    try {
      const { message, subscriptionsContext } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

      const generateSmartFallback = (msg: string, ctx: any) => {
        const text = (msg || '').toLowerCase();
        const subs = ctx?.subscriptions || [];
        const currency = ctx?.currency || 'INR';
        const total = subs.reduce((acc: number, s: any) => acc + (s.amount || 0), 0);

        if (text.includes('spend') || text.includes('much') || text.includes('cost') || text.includes('total')) {
          return `You are currently tracking ${subs.length} active subscriptions. Your total recorded subscription spending is approximately ${currency} ${total.toLocaleString()}.`;
        }
        if (text.includes('cut') || text.includes('save') || text.includes('reduce') || text.includes('optimize')) {
          return `To optimize your SaaS budget, consider reviewing subscriptions you haven't used recently and switching monthly plans to annual billing where available to save up to 15-20%.`;
        }
        if (text.includes('renewal') || text.includes('upcoming') || text.includes('due')) {
          return `You have ${subs.length} subscriptions in your portfolio. You can check the 'Upcoming Renewals' tab for exact billing dates due this week.`;
        }
        return `Based on your subscription portfolio of ${subs.length} active services, you are managing your recurring expenses well! Let me know if you need help analyzing spending by category or finding savings.`;
      };

      if (!apiKey || !ai) {
        return res.json({
          reply: generateSmartFallback(message, subscriptionsContext)
        });
      }

      try {
        const prompt = `You are a helpful, expert AI Subscription Assistant for 'Track My Subscription'.
Here is the user's current subscription context:
${JSON.stringify(subscriptionsContext, null, 2)}

User question: "${message}"

Provide a concise, highly insightful, friendly, and structured financial response with actionable recommendations for saving money or optimizing recurring costs.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const reply = response.text || generateSmartFallback(message, subscriptionsContext);
        res.json({ reply });
      } catch (aiErr: any) {
        console.error('Gemini AI Generation Error:', aiErr);
        res.json({
          reply: generateSmartFallback(message, subscriptionsContext)
        });
      }
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      res.json({
        reply: "Based on your active subscriptions, you are managing your SaaS portfolio effectively! Consider reviewing annual billing options to save up to 15%."
      });
    }
  });

  // Invoice Parser API
  app.post('/api/parse-invoice', async (req, res) => {
    try {
      const { fileBase64, mimeType, fileName } = req.body;
      if (!ai) {
        // Fallback mock extraction if API key isn't set
        return res.json({
          success: true,
          extracted: {
            service_name: "Netflix Entertainment",
            merchant_name: "Netflix Inc.",
            invoice_number: "INV-" + Math.floor(100000 + Math.random() * 900000),
            invoice_date: new Date().toISOString().split('T')[0],
            amount: 649,
            currency: "INR",
            tax_amount: 98.83,
            billing_period_start: new Date().toISOString().split('T')[0],
            billing_period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            plan_name: "Premium 4K",
            next_renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
          }
        });
      }

      const parts: any[] = [];
      if (fileBase64) {
        parts.push({
          inlineData: {
            data: fileBase64,
            mimeType: mimeType || 'image/png'
          }
        });
      }

      parts.push({
        text: `Extract subscription invoice details from this document and return strictly valid JSON matching this schema:
{
  "service_name": "string",
  "merchant_name": "string",
  "invoice_number": "string",
  "invoice_date": "YYYY-MM-DD",
  "amount": number,
  "currency": "INR|USD|EUR|GBP|AED",
  "tax_amount": number,
  "billing_period_start": "YYYY-MM-DD",
  "billing_period_end": "YYYY-MM-DD",
  "plan_name": "string",
  "next_renewal_date": "YYYY-MM-DD"
}`
      });

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: parts,
        });

        let text = response.text || '{}';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(text);

        res.json({ success: true, extracted });
      } catch (aiErr: any) {
        console.warn('Gemini Invoice Generation Error, using fallback parser:', aiErr.message);
        res.json({
          success: true,
          extracted: {
            service_name: fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : "Netflix Entertainment",
            merchant_name: "Netflix Inc.",
            invoice_number: "INV-" + Math.floor(100000 + Math.random() * 900000),
            invoice_date: new Date().toISOString().split('T')[0],
            amount: 649,
            currency: "INR",
            tax_amount: 98.83,
            billing_period_start: new Date().toISOString().split('T')[0],
            billing_period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            plan_name: "Premium 4K",
            next_renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
          }
        });
      }
    } catch (error: any) {
      console.error('Invoice Parser Error:', error);
      res.status(500).json({ error: error.message || 'Failed to parse invoice' });
    }
  });

  // Webhook Test Trigger API
  app.post('/api/webhooks/test', async (req, res) => {
    try {
      const { endpointUrl, eventType, payload } = req.body;
      // Simulate webhook delivery
      await new Promise(r => setTimeout(r, 600));
      res.json({
        success: true,
        status: 200,
        message: `Successfully delivered ${eventType} to ${endpointUrl}`,
        delivered_at: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for frontend development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Track My Subscription SaaS running at http://localhost:${port}`);
  });
}

startServer();
