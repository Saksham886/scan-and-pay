"use client";

import { useEffect, useState } from "react";
import { Card } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Modal } from "@/frontend/components/ui/modal";
import { Badge } from "@/frontend/components/ui/badge";
import { EmptyState } from "@/frontend/components/ui/empty-state";
import { Plus, Users, Mail, Shield } from "lucide-react";
import type { UserInfo } from "@/shared/types";
import type { UserRole } from "@/generated/prisma";

interface CafeOption {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [cafes, setCafes] = useState<CafeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("CAFE_OWNER");
  const [formCafeId, setFormCafeId] = useState("");
  const [formError, setFormError] = useState("");

  const fetchData = async () => {
    try {
      const [usersRes, cafesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/cafes"),
      ]);
      const usersData = await usersRes.json();
      const cafesData = await cafesRes.json();

      if (usersData.success) setUsers(usersData.data);
      if (cafesData.success) {
        setCafes(
          cafesData.data.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword) {
      setFormError("All fields are required");
      return;
    }
    if (formRole !== "SUPER_ADMIN" && !formCafeId) {
      setFormError("Select a cafe for this role");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          cafeId: formRole === "SUPER_ADMIN" ? undefined : formCafeId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || "Failed to create user");
      } else {
        setShowModal(false);
        resetForm();
        fetchData();
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("CAFE_OWNER");
    setFormCafeId("");
    setFormError("");
  };

  const roleVariant = (role: UserRole) => {
    switch (role) {
      case "SUPER_ADMIN": return "danger" as const;
      case "CAFE_OWNER": return "info" as const;
      case "CAFE_STAFF": return "default" as const;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} className="mr-1.5" />
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No users yet"
          description="Create staff and owner accounts"
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus size={18} className="mr-1.5" /> Add User
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{user.name}</p>
                      <Badge variant={roleVariant(user.role)}>
                        {user.role.replace("_", " ")}
                      </Badge>
                      {!user.isActive && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {user.email}
                      </span>
                      {user.cafeName && (
                        <span className="flex items-center gap-1">
                          <Shield size={12} /> {user.cafeName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New User">
        <div className="space-y-4">
          <Input
            id="user-name"
            label="Full Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="John Doe"
            required
          />
          <Input
            id="user-email"
            label="Email"
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="john@cafe.com"
            required
          />
          <Input
            id="user-password"
            label="Password"
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
          />

          <div>
            <label className="block text-sm font-medium mb-1.5">Role</label>
            <select
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as UserRole)}
            >
              <option value="CAFE_OWNER">Cafe Owner</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          {formRole !== "SUPER_ADMIN" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Assign to Cafe</label>
              <select
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={formCafeId}
                onChange={(e) => setFormCafeId(e.target.value)}
              >
                <option value="">Select a cafe</option>
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {formError && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl border border-danger/25">
              {formError}
            </div>
          )}

          <Button onClick={handleCreate} className="w-full" loading={saving}>
            Create User
          </Button>
        </div>
      </Modal>
    </div>
  );
}
