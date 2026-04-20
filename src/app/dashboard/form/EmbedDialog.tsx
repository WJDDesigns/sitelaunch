"use client";

import { useState, useRef } from "react";

type EmbedType = "iframe" | "widget";
type EmbedStyle = "branded" | "chromeless";

interface Props {
  formUrl: string;
  formName: string;
  onClose: () => void;
}

export default function EmbedDialog({ formUrl, formName, onClose }: Props) {
  const [embedType, setEmbedType] = useState<EmbedType>("iframe");
  const [embedStyle, setEmbedStyle] = useState<EmbedStyle>("branded");
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const params = embedStyle === "chromeless" ? "?embed=1&chromeless=1" : "?embed=1";
  const embedUrl = `${formUrl}${params}`;

  const iframeCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none; border-radius: 12px; max-width: 100%;"
  allow="payment"
  loading="lazy"
></iframe>`;

  const widgetCode = `<!-- linqme Form Widget: ${formName} -->
<div id="linqme-form-embed"></div>
<script>
(function() {
  var container = document.getElementById('linqme-form-embed');
  var iframe = document.createElement('iframe');
  iframe.src = '${embedUrl}';
  iframe.style.cssText = 'width:100%;border:none;border-radius:12px;min-height:700px;';
  iframe.setAttribute('allow', 'payment');
  iframe.setAttribute('loading', 'lazy');
  container.appendChild(iframe);

  // Auto-resize based on content height
  window.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'linqme-resize' && data.height) {
        iframe.style.height = data.height + 'px';
      }
    } catch(_) {}
  });
})();
</script>`;

  const code = embedType === "iframe" ? iframeCode : widgetCode;

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-surface-container rounded-2xl border border-outline-variant/15 shadow-2xl shadow-black/30 w-full max-w-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-on-surface font-headline">Embed Form</h2>
            <p className="text-xs text-on-surface-variant/60 mt-0.5">Add this form to any website or landing page</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-on-surface/5 text-on-surface-variant/60 transition-colors">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Embed Type Toggle */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Embed Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setEmbedType("iframe")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                embedType === "iframe"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
              }`}
            >
              <i className="fa-solid fa-code text-xs" />
              iFrame
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-primary/15 text-primary">Best</span>
            </button>
            <button
              onClick={() => setEmbedType("widget")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                embedType === "widget"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
              }`}
            >
              <i className="fa-solid fa-puzzle-piece text-xs" />
              JS Widget
            </button>
          </div>
        </div>

        {/* Display Style Toggle */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Display Style</label>
          <div className="flex gap-2">
            <button
              onClick={() => setEmbedStyle("branded")}
              className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                embedStyle === "branded"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
              }`}
            >
              <i className="fa-solid fa-building text-xs" />
              <span>Full (with branding)</span>
            </button>
            <button
              onClick={() => setEmbedStyle("chromeless")}
              className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                embedStyle === "chromeless"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
              }`}
            >
              <i className="fa-solid fa-minimize text-xs" />
              <span className="flex items-center gap-1.5">Chromeless <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-primary/15 text-primary">Best</span></span>
              <span className="text-[10px] opacity-60 -mt-0.5">No header</span>
            </button>
          </div>
        </div>

        {/* Code Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Embed Code</label>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} text-[10px]`} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <textarea
            ref={codeRef}
            readOnly
            value={code}
            rows={embedType === "iframe" ? 6 : 14}
            className="w-full px-4 py-3 text-xs font-mono bg-surface-container-lowest rounded-xl border border-outline-variant/15 text-on-surface/80 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>

        {/* Tips */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
          <i className="fa-solid fa-circle-info text-primary text-xs mt-0.5 shrink-0" />
          <p className="text-xs text-on-surface-variant/70 leading-relaxed">
            {embedType === "iframe"
              ? "Paste this code into any HTML page. Adjust the height attribute to fit your form length."
              : "The JS widget auto-resizes to match your form content. Place the snippet where you want the form to appear."}
          </p>
        </div>
      </div>
    </div>
  );
}
