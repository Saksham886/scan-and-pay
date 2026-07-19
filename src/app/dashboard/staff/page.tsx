"use client";

import { useEffect, useState } from "react";
import { Users, Phone, UserCircle2 } from "lucide-react";
import { EmptyState } from "@/frontend/components/ui/empty-state";

interface StaffMember {
  id: string;
  name: string;
  age: number;
  mobileNumber: string;
}

export default function OwnerStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/staff")
      .then((r) => r.json())
      .then((d) => { if (d.success) setStaff(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <p className="text-sm text-muted mt-0.5">Your cafe&apos;s current active staff members</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No staff yet"
          description="Your admin will add staff members here"
        />
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-border">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{member.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-xs text-muted mt-0.5">Age {member.age} · {member.mobileNumber}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-3 gap-3 px-4 py-3 bg-surface-hover border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wide">
              <span className="flex items-center gap-1.5"><UserCircle2 size={11} /> Name</span>
              <span>Age</span>
              <span className="flex items-center gap-1.5"><Phone size={11} /> Mobile</span>
            </div>
            {staff.map((member, i) => (
              <div
                key={member.id}
                className={`grid grid-cols-3 gap-3 px-4 py-3.5 items-center hover:bg-surface-hover/50 transition-colors ${i < staff.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{member.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="font-medium text-sm truncate">{member.name}</span>
                </div>
                <span className="text-sm text-muted">{member.age}</span>
                <span className="text-sm text-muted">{member.mobileNumber}</span>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-surface-hover border-t border-border text-xs text-muted">
            {staff.length} {staff.length === 1 ? "member" : "members"} total
          </div>
        </div>
      )}
    </div>
  );
}
