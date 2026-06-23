"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { User, Heart, Layers, ThumbsUp, Save, Check, Camera, X, MapPin, FileText } from "lucide-react";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  location: string | null;
  role: string;
  setupCount: number;
  favoriteCount: number;
  likeCount: number;
};

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error.message);
          return;
        }
        setProfile(data);
        setName(data.name ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setImage(data.image ?? null);
      })
      .catch(() => setError("Failed to load profile"));
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio: bio || undefined,
          location: location || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message);
        return;
      }
      setProfile(data);
      setSaved(true);
      await updateSession();
    } catch {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/v1/users/me/avatar", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message);
        return;
      }
      setImage(data.image);
      setProfile((prev) => prev ? { ...prev, image: data.image } : prev);
      await updateSession();
    } catch {
      setError("Failed to upload image.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAvatar() {
    setImage(null);
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Setups", value: profile.setupCount, icon: Layers, color: "text-blue-500" },
          { label: "Favorites", value: profile.favoriteCount, icon: Heart, color: "text-rose-500" },
          { label: "Likes Received", value: profile.likeCount, icon: ThumbsUp, color: "text-emerald-500" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg bg-muted p-2 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Avatar Section */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Camera className="h-5 w-5 text-muted-foreground" />
          Profile Photo
        </h2>

        <div className="flex items-start gap-6">
          {/* Avatar Preview */}
          <div className="relative group">
            <div className="h-24 w-24 rounded-full border-2 border-border overflow-hidden bg-muted">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <User className="h-10 w-10 text-primary/40" />
                </div>
              )}
            </div>

            {/* Upload overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              title="Upload photo"
            >
              {uploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>
          </div>

          {/* Upload controls */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onFileChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Choose File"}
              </button>
              {image && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          Personal Information
        </h2>

        <form onSubmit={onSave} className="space-y-4 max-w-lg">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                placeholder="Your display name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={profile.email ?? ""}
              disabled
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium mb-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                placeholder="e.g. Ho Chi Minh City"
                maxLength={100}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={280}
                className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none"
                placeholder="Tell people about your workspace..."
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground text-right">{bio.length}/280</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {saved && (
            <p className="flex items-center gap-1 text-sm text-emerald-600">
              <Check className="h-4 w-4" />
              Profile saved!
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
