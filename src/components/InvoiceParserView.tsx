import React, { useState } from 'react';
import { FileText, Upload, Sparkles, Check, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { Invoice, Subscription } from '../types';

interface InvoiceParserViewProps {
  invoices: Invoice[];
  onAddInvoiceAndSubscription: (invoiceData: any, subData: any) => Promise<boolean>;
}

export const InvoiceParserView: React.FC<InvoiceParserViewProps> = ({
  invoices,
  onAddInvoiceAndSubscription,
}) => {
  const [loading, setLoading] = useState(false);
  const [extractedResult, setExtractedResult] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        const res = await fetch('/api/parse-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64String,
            mimeType: file.type,
            fileName: file.name
          })
        });
        const data = await res.json();
        if (data.success) {
          setExtractedResult(data.extracted);
        }
      } catch (err) {
        console.error('Parsing error:', err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImport = async () => {
    if (!extractedResult) return;
    const saved = await onAddInvoiceAndSubscription(extractedResult, {
      service_name: extractedResult.service_name || 'Extracted Service',
      logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
      category_id: 'cat-productivity',
      plan_name: extractedResult.plan_name || 'Standard Plan',
      amount: extractedResult.amount || 499,
      currency: extractedResult.currency || 'INR',
      billing_cycle: 'monthly',
      start_date: extractedResult.invoice_date || new Date().toISOString().split('T')[0],
      next_billing_date: extractedResult.next_renewal_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'active',
      payment_method_label: 'Auto-extracted from invoice'
    });
    if (saved) {
      setSuccessMsg('Successfully imported subscription from invoice!');
      setExtractedResult(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">AI Invoice & Receipt Parser</h2>
          <p className="text-xs text-gray-500 mt-1">Upload PDF or image receipts and let Gemini extract subscription details instantly</p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-gray-300 text-center relative hover:border-[#7657E8] transition-all">
        <input 
          type="file" 
          accept="image/*,application/pdf"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="w-16 h-16 rounded-2xl bg-[#7657E8]/10 text-[#7657E8] flex items-center justify-center mx-auto mb-4">
          {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
        </div>
        <h3 className="text-base font-bold text-gray-900">
          {loading ? 'Analyzing invoice with Gemini AI...' : 'Drop your invoice file here, or browse'}
        </h3>
        <p className="text-xs text-gray-500 mt-1">Supports PDF, PNG, JPG up to 10MB</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Extracted Review Card */}
      {extractedResult && (
        <div className="bg-white rounded-2xl p-6 border border-[#7657E8]/30 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-[#7657E8] font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Extracted Invoice Details Review</span>
            </div>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-[#7657E8] text-white rounded-xl text-xs font-semibold shadow-md hover:bg-[#6444d4]"
            >
              Confirm & Import Subscription
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-400">Service Name</span>
              <p className="font-bold text-gray-900">{extractedResult.service_name}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Merchant</span>
              <p className="font-bold text-gray-900">{extractedResult.merchant_name}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Amount</span>
              <p className="font-bold text-gray-900">{extractedResult.currency} {extractedResult.amount}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Next Renewal</span>
              <p className="font-bold text-gray-900">{extractedResult.next_renewal_date}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Parsed Invoices Archive</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="p-3">Invoice Number</th>
              <th className="p-3">Merchant</th>
              <th className="p-3">Date</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="p-3 font-semibold text-gray-900">{inv.invoice_number || 'INV-001'}</td>
                <td className="p-3 text-gray-700">{inv.merchant_name}</td>
                <td className="p-3 text-xs text-gray-500">{inv.invoice_date}</td>
                <td className="p-3 font-bold text-gray-900">{inv.currency} {inv.amount}</td>
                <td className="p-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase">
                    {inv.parsing_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
