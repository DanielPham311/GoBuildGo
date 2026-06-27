"use client";

import { useState, useEffect } from "react";
import { Bell, Save, Check } from "lucide-react";

type EmailSettings = {
  priceAlerts: boolean;
  weeklyDigest: boolean;
  promotions: boolean;
};

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>({
    priceAlerts: false,
    weeklyDigest: false,
    promotions: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/users/me/email-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error.message);
          return;
        }
        setSettings(data);
      })
      .catch(() => setError("Something went wrong"));
  }, []);

  async function onSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/v1/users/me/email-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message);
        return;
      }
      setSettings(data);
      setSaved(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof EmailSettings, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Bell className="h-5 w-5 text-muted-foreground" />
        Email Settings
      </h2>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3 max-w-lg">
        <Toggle
          label="Price Alerts"
          description="Get notified when favorited components drop in price."
          checked={settings.priceAlerts}
          onChange={(v) => update("priceAlerts", v)}
        />
        <Toggle
          label="Weekly Digest"
          description="A weekly summary of trending setups and price drops."
          checked={settings.weeklyDigest}
          onChange={(v) => update("weeklyDigest", v)}
        />
        <Toggle
          label="Promotions"
          description="Receive promotional emails from partners."
          checked={settings.promotions}
          onChange={(v) => update("promotions", v)}
        />
      </div>

      {saved && (
        <p className="flex items-center gap-1 text-sm text-emerald-600">
          <Check className="h-4 w-4" />
          Saved!
        </p>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
