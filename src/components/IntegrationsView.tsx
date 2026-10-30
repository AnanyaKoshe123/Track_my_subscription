import React, { useState } from 'react';
import { Plug, Chrome, Shield, Check, Plus, RefreshCw, Send, Trash2, ExternalLink } from 'lucide-react';
import { WebhookEndpoint } from '../types';

interface IntegrationsViewProps {
  webhooks: WebhookEndpoint[];
  onAddWebhook: (url: string, events: string[]) => Promise<boolean>;
  onDeleteWebhook: (id: string) => Promise<boolean>;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  webhooks,
  onAddWebhook,
  onDeleteWebhook,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);

  const handleTestWebhook = async (endpointUrl: string) => {
    setLoadingTest(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointUrl, eventType: 'subscription.created', payload: { test: true } })
      });
      const data = await res.json();
      setTestStatus(data.message || 'Webhook delivered successfully');
    } catch (err) {
      setTestStatus('Failed to deliver webhook');
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations & Webhooks</h2>
          <p className="text-xs text-gray-500 mt-1">Connect external services, automated webhooks, and the Chrome extension companion</p>
        </div>
      </div>

      {/* Chrome Extension Companion Card */}
      <div className="bg-gradient-to-r from-[#172B3A] to-[#004547] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <Chrome className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Track My Subscription Chrome Extension</h3>
            <p className="text-xs text-white/70 mt-1">Detect active SaaS pricing pages and sync subscriptions directly to your dashboard.</p>
          </div>
        </div>
        <button 
          onClick={() => alert("Chrome Extension package is ready for deployment. Download manifest.json and popup scripts from the workspace.")}
          className="px-5 py-2.5 rounded-xl bg-[#7657E8] text-white hover:bg-[#6444d4] transition-all text-xs font-semibold shadow-md whitespace-nowrap"
        >
          Download Extension Pack
        </button>
      </div>

      {/* Webhooks Management */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Webhook Endpoints</h3>
            <p className="text-xs text-gray-500">Receive real-time event payloads when subscriptions renew or change</p>
          </div>
        </div>

        {/* Add Webhook Form */}
        <div className="flex gap-3">
          <input 
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://api.mycompany.com/webhooks"
            className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20"
          />
          <button
            onClick={async () => {
              if (newUrl.trim()) {
                if (await onAddWebhook(newUrl, ['subscription.created', 'subscription.renewal_approaching'])) {
                  setNewUrl('');
                }
              }
            }}
            className="px-5 py-2.5 bg-[#7657E8] text-white rounded-xl text-xs font-semibold shadow-md hover:bg-[#6444d4]"
          >
            Add Endpoint
          </button>
        </div>

        {testStatus && (
          <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-xl border border-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{testStatus}</span>
          </div>
        )}

        {/* Webhooks List */}
        <div className="space-y-3 pt-2">
          {webhooks.map((hook) => (
            <div key={hook.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h4 className="font-bold text-gray-900 text-sm">{hook.endpoint_url}</h4>
                </div>
                <p className="text-xs text-gray-500 mt-1">Secret: <code className="bg-gray-200/60 px-1.5 py-0.5 rounded text-[11px]">{hook.signing_secret}</code></p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestWebhook(hook.endpoint_url)}
                  disabled={loadingTest}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-gray-400" />
                  <span>Test Trigger</span>
                </button>
                <button
                  onClick={() => { void onDeleteWebhook(hook.id); }}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
