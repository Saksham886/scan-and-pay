import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-5 border border-border">
        <WifiOff size={32} className="text-muted" />
      </div>
      <h1 className="text-2xl font-bold mb-2">You&apos;re Offline</h1>
      <p className="text-muted max-w-sm">
        Check your connection and try again. Any page you&apos;ve already
        visited may still be available.
      </p>
    </div>
  );
}
