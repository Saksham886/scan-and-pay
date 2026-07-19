"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { paiseToCurrency } from "@/shared/utils/currency";
import { cn } from "@/shared/utils/cn";
import {
  Plus,
  Trash2,
  Receipt,
  TrendingDown,
  X,
  Tag,
  CalendarDays,
} from "lucide-react";

interface Expense {
  id: string;
  title: string;
  description: string | null;
  amountPaise: number;
  category: string;
  date: string;
  createdAt: string;
}

type TimeRange = "today" | "week" | "month" | "year" | "all";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

const CATEGORIES = [
  "General",
  "Rent",
  "Utilities",
  "Ingredients",
  "Salaries",
  "Equipment",
  "Marketing",
  "Maintenance",
  "Other",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AccountsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalPaise, setTotalPaise] = useState(0);
  const [range, setRange] = useState<TimeRange>("month");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchExpenses = useCallback(async (r: TimeRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/expenses?range=${r}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data.expenses);
        setTotalPaise(data.data.totalPaise);
      }
    } catch {
      console.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses(range);
  }, [range, fetchExpenses]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const amountNum = parseFloat(amount);
    if (!title.trim() || isNaN(amountNum) || amountNum <= 0) {
      setFormError("Title and a valid amount are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          amountPaise: Math.round(amountNum * 100),
          category,
          date,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTitle("");
        setDescription("");
        setAmount("");
        setCategory("General");
        setDate(new Date().toISOString().split("T")[0]);
        setShowForm(false);
        fetchExpenses(range);
      } else {
        setFormError(data.error ?? "Failed to add expense");
      }
    } catch {
      setFormError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/dashboard/expenses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        const removed = expenses.find((e) => e.id === id);
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setTotalPaise((prev) => prev - (removed?.amountPaise ?? 0));
      }
    } finally {
      setDeleting(null);
    }
  }

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amountPaise;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted mt-0.5">Track your cafe expenditures</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={16} />
          Add Expense
        </Button>
      </div>

      {/* Time Range Filter */}
      <div className="flex gap-2 flex-wrap">
        {TIME_RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
              range === r.value
                ? "bg-primary text-white border-primary shadow-sm"
                : "border-border text-muted hover:text-foreground hover:border-foreground/30"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <TrendingDown size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted">Total Spent</p>
                <p className="text-xl font-bold text-red-500">{paiseToCurrency(totalPaise)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Receipt size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted">Entries</p>
                <p className="text-xl font-bold">{expenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Tag size={20} className="text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted">Top Category</p>
                <p className="text-xl font-bold truncate">
                  {Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "/"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
              <h2 className="font-semibold text-lg">Add Expense</h2>
              <button
                onClick={() => { setShowForm(false); setFormError(""); }}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <Input
                id="title"
                label="Title"
                placeholder="e.g. Milk supplies, Electricity bill"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="amount"
                  label="Amount (₹)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <Input
                  id="date"
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-foreground"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description <span className="text-muted font-normal">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none text-foreground"
                />
              </div>
              {formError && (
                <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowForm(false); setFormError(""); }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={saving}>
                  Add Expense
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Log */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Expense Log</h2>
            {!loading && (
              <span className="text-xs text-muted">
                {TIME_RANGES.find((r) => r.value === range)?.label}
              </span>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-surface-hover flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-surface-hover rounded w-1/3" />
                    <div className="h-3 bg-surface-hover rounded w-1/4" />
                  </div>
                  <div className="h-4 bg-surface-hover rounded w-16" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center text-muted">
              <Receipt size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No expenses recorded</p>
              <p className="text-sm mt-1">Click &quot;Add Expense&quot; to start tracking</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-surface-hover/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Receipt size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{expense.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted bg-surface-hover px-2 py-0.5 rounded-full">
                        {expense.category}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <CalendarDays size={10} />
                        {formatDate(expense.date)}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-xs text-muted mt-1 truncate">{expense.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-red-500 text-sm whitespace-nowrap">
                      −{paiseToCurrency(expense.amountPaise)}
                    </span>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={deleting === expense.id}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Category Breakdown */}
          {!loading && expenses.length > 0 && Object.keys(byCategory).length > 1 && (
            <div className="px-5 py-4 border-t border-border bg-surface-hover/30">
              <p className="text-xs font-medium text-muted mb-3">By Category</p>
              <div className="space-y-2">
                {Object.entries(byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, paise]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs text-muted w-24 truncate">{cat}</span>
                      <div className="flex-1 bg-border rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(paise / totalPaise) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-20 text-right">
                        {paiseToCurrency(paise)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Total Footer */}
          {!loading && expenses.length > 0 && (
            <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
              <span className="text-sm font-medium text-muted">Total</span>
              <span className="font-bold text-red-500">{paiseToCurrency(totalPaise)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
