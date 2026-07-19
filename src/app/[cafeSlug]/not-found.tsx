import Link from "next/link";
import { Coffee } from "lucide-react";

export default function CafeNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-5 border border-border">
        <Coffee size={32} className="text-muted" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Cafe Not Found</h1>
      <p className="text-muted mb-6 max-w-sm">
        The cafe you&apos;re looking for doesn&apos;t exist or is currently inactive.
        Please scan the QR code again.
      </p>
      <Link
        href="/"
        className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
