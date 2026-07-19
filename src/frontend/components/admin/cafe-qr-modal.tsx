"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Modal } from "@/frontend/components/ui/modal";
import { Button } from "@/frontend/components/ui/button";
import { Download, Copy, Check, ExternalLink, Printer } from "lucide-react";

interface CafeQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeName: string;
  cafeSlug: string;
}

export function CafeQRModal({ isOpen, onClose, cafeName, cafeSlug }: CafeQRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/${cafeSlug}`
    : `/${cafeSlug}`;

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, url, {
      width: 320,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).catch((err) => console.error("QR render error:", err));

    // Generate a higher-res data URL for download
    QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setDataUrl)
      .catch((err) => console.error("QR data URL error:", err));
  }, [isOpen, url]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${cafeSlug}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${cafeName} QR Code</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            p { color: #64748b; margin: 0 0 24px; font-size: 14px; }
            img { width: 80%; max-width: 480px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; background: white; }
            .url { margin-top: 20px; font-family: monospace; font-size: 13px; color: #334155; word-break: break-all; }
            .cta { margin-top: 24px; font-size: 18px; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>${cafeName}</h1>
          <p class="cta">Scan to order</p>
          <img src="${dataUrl}" alt="QR Code" />
          <div class="url">${url}</div>
          <script>window.onload = () => { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cafe QR Code">
      <div className="space-y-5">
        <div className="text-center">
          <p className="text-sm text-muted mb-1">Customers scan this to order at</p>
          <p className="font-bold text-base">{cafeName}</p>
        </div>

        {/* QR */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-2xl border border-border shadow-sm">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>

        {/* URL row */}
        <div className="bg-surface-hover rounded-xl p-3 flex items-center gap-2">
          <code className="flex-1 text-xs font-mono text-foreground truncate">
            {url}
          </code>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-surface transition-colors flex-shrink-0"
            title="Copy URL"
          >
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-surface transition-colors flex-shrink-0"
            title="Open menu"
          >
            <ExternalLink size={16} />
          </a>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={handlePrint} disabled={!dataUrl}>
            <Printer size={16} className="mr-1.5" />
            Print
          </Button>
          <Button onClick={handleDownload} disabled={!dataUrl}>
            <Download size={16} className="mr-1.5" />
            Download PNG
          </Button>
        </div>

        <p className="text-xs text-muted text-center">
          Tip: Print and place at the counter or on tables so customers can scan & order.
        </p>
      </div>
    </Modal>
  );
}
