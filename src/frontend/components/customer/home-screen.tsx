"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, ArrowRight, Star, UtensilsCrossed } from "lucide-react";
import type { CafeMeta } from "@/shared/types";

interface HomeScreenProps {
  cafeSlug: string;
  meta: CafeMeta;
}

export function HomeScreen({ cafeSlug, meta }: HomeScreenProps) {
  const { cafe, activeMenu } = meta;

  return (
    <div
      className="customer-app min-h-screen flex flex-col"
      style={{
        background: "#111222",
        backgroundImage:
          "radial-gradient(at 0% 0%, rgba(160,120,255,0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(205,242,0,0.04) 0px, transparent 50%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-[#0c0d1d]">
        {cafe.imageUrl ? (
          <>
            <Image
              src={cafe.imageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-40 contrast-125 saturate-150"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c0d1d]/40 via-[#0c0d1d]/70 to-[#111222]" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at top right, rgba(160,120,255,0.18), transparent 55%), radial-gradient(ellipse at bottom left, rgba(109,59,215,0.22), transparent 60%)",
            }}
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative px-5 pt-16 pb-10">
          <div className="inline-flex items-center gap-2 mb-5 animate-fade-in-up">
            <span className="h-1.5 w-1.5 rounded-full bg-[#cdf200]" />
            <span
              className="text-[10px] tracking-[0.22em] font-medium uppercase text-[#cdf200]/80"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              Welcome
            </span>
          </div>

          <h1
            className="text-[2.4rem] leading-[1.0] tracking-[-0.03em] font-extrabold text-[#e2e0f8] mb-4 animate-fade-in-up uppercase"
            style={{ fontFamily: "var(--font-display), sans-serif", animationDelay: "50ms" }}
          >
            {cafe.name}
          </h1>

          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#cbc3d7] animate-fade-in-up"
            style={{ fontFamily: "var(--font-jb-mono), monospace", animationDelay: "100ms" }}
          >
            {cafe.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} className="text-[#a078ff]" />
                <span>{cafe.address}</span>
              </span>
            )}
            {cafe.openingTime && cafe.closingTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} className="text-[#a078ff]" />
                <span>
                  {cafe.openingTime} – {cafe.closingTime}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#a078ff]/60 to-transparent" />
      </div>

      {/* ── Actions ── */}
      <div className="flex-1 flex flex-col justify-center px-5 py-10 gap-4 max-w-sm mx-auto w-full">
        {activeMenu ? (
          <Link
            href={`/${cafeSlug}/menu`}
            className="group relative flex items-center justify-between gap-3 bg-[#cdf200] text-black border-2 border-black px-6 py-5 font-bold text-base uppercase tracking-wider neo-shadow active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 rounded-full animate-fade-in-up"
            style={{ fontFamily: "var(--font-jb-mono), monospace" }}
          >
            <span className="flex items-center gap-3">
              <UtensilsCrossed size={20} />
              Start Ordering
            </span>
            <ArrowRight size={20} />
          </Link>
        ) : (
          <div
            className="bg-[#1e1e2f] border-2 border-[#494454] px-6 py-5 text-center animate-fade-in-up"
            style={{ borderRadius: 0 }}
          >
            <p
              className="font-bold text-[#e2e0f8] uppercase mb-1"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Not accepting orders right now
            </p>
            <p className="text-sm text-[#cbc3d7]" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>
              Please check back later
            </p>
          </div>
        )}

        <Link
          href={`/${cafeSlug}/feedback`}
          className="flex items-center justify-between gap-3 bg-transparent text-[#e2e0f8] border-2 border-[#494454] hover:border-[#a078ff] px-6 py-5 font-bold text-base uppercase tracking-wider transition-colors duration-100 rounded-full animate-fade-in-up"
          style={{ fontFamily: "var(--font-jb-mono), monospace", animationDelay: "60ms" }}
        >
          <span className="flex items-center gap-3">
            <Star size={20} className="text-[#a078ff]" />
            Feedback
          </span>
          <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  );
}
