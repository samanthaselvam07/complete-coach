"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { signOut } from "next-auth/react";
import { Camera, LockKeyhole, LogOut, ShieldCheck, Trash2, UserRound } from "lucide-react";

import { cn } from "@/components/ui/utils";

import { ClientMobileShell, ClientSectionHeading } from "./client-mobile-shell";

interface ClientProfilePayload {
  user: {
    id: string;
    name: string;
    email: string;
    photoUrl: string | null;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    timezone: string;
    status: string;
  };
  privacyPolicyUrl: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  photoDataUrl: string | null;
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  photoDataUrl: null
};

const maxProfilePhotoBytes = 250_000;

export function ClientAccountProfilePage() {
  const [profile, setProfile] = useState<ClientProfilePayload | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/v1/client/profile");
        const payload = (await response.json()) as { data?: ClientProfilePayload; error?: { message?: string } };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "Unable to load profile.");
        }

        if (!active) {
          return;
        }

        setProfile(payload.data);
        setForm({
          firstName: payload.data.client.firstName,
          lastName: payload.data.client.lastName,
          email: payload.data.user.email || payload.data.client.email,
          phone: payload.data.client.phone,
          password: "",
          photoDataUrl: payload.data.user.photoUrl
        });
      } catch (profileError) {
        if (active) {
          setError(profileError instanceof Error ? profileError.message : "Unable to load profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const avatarLabel = useMemo(() => {
    const initials = `${form.firstName.slice(0, 1)}${form.lastName.slice(0, 1)}`.trim();

    return initials || profile?.user.name || "CC";
  }, [form.firstName, form.lastName, profile?.user.name]);

  async function handlePhotoChange(file: File | undefined) {
    setError("");

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG, or WebP profile picture.");
      return;
    }

    if (file.size > maxProfilePhotoBytes) {
      setError("Please choose an image under 250KB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((current) => ({ ...current, photoDataUrl: dataUrl }));
    } catch {
      setError("Unable to read that image. Please choose another photo.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/v1/client/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          ...(form.password ? { password: form.password } : {}),
          ...(form.photoDataUrl !== profile?.user.photoUrl ? { photoDataUrl: form.photoDataUrl ?? "" } : {})
        })
      });
      const payload = (await response.json()) as { data?: ClientProfilePayload; error?: { message?: string } };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Unable to save profile.");
      }

      setProfile(payload.data);
      setForm({
        firstName: payload.data.client.firstName,
        lastName: payload.data.client.lastName,
        email: payload.data.user.email || payload.data.client.email,
        phone: payload.data.client.phone,
        password: "",
        photoDataUrl: payload.data.user.photoUrl
      });
      setStatus("Profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirmation !== "DELETE") {
      return;
    }

    setDeleting(true);
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/v1/client/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation })
      });
      const payload = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to delete account.");
      }

      await signOut({ redirectTo: "/sign-in" });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete account.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <ClientMobileShell title="Profile" avatarLabel="CC">
        <section className="rounded-[2rem] bg-white p-6 shadow-[0_18px_45px_rgba(27,28,28,0.08)]">
          <p className="text-sm font-bold text-[#777584]">Loading profile...</p>
        </section>
      </ClientMobileShell>
    );
  }

  return (
    <ClientMobileShell title="Profile" avatarLabel={avatarLabel}>
      <div className="space-y-6">
        <ClientSectionHeading eyebrow="Account" title="Profile" />

        {error ? (
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        {status ? (
          <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {status}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.08)]">
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-[#f4f1ef] text-xl font-black text-[#3620b8]">
              {form.photoDataUrl ? (
                <img src={form.photoDataUrl} alt="Profile picture preview" className="size-full object-cover" />
              ) : (
                avatarLabel.slice(0, 2).toUpperCase()
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1b1c1c] px-4 py-3 text-xs font-black uppercase text-white transition active:scale-95">
              <Camera aria-hidden="true" className="size-4" />
              Add photo
              <input
                aria-label="Profile picture"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                className="sr-only"
                onChange={(event) => void handlePhotoChange(event.currentTarget.files?.[0])}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ProfileField
              label="First name"
              value={form.firstName}
              onChange={(value) => setForm((current) => ({ ...current, firstName: value }))}
              required
            />
            <ProfileField
              label="Last name"
              value={form.lastName}
              onChange={(value) => setForm((current) => ({ ...current, lastName: value }))}
              required
            />
          </div>

          <ProfileField
            label="Email address"
            type="email"
            value={form.email}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            required
          />
          <ProfileField
            label="Phone number"
            type="tel"
            value={form.phone}
            onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
          />
          <ProfileField
            label="New password"
            type="password"
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            placeholder="Leave blank to keep current password"
          />

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#3620b8] px-5 py-4 text-sm font-black uppercase text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserRound aria-hidden="true" className="size-4" />
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>

        <section className="grid gap-3 rounded-[2rem] bg-white p-5 shadow-[0_18px_45px_rgba(27,28,28,0.08)]">
          <Link
            href={(profile?.privacyPolicyUrl ?? "/privacy-policy") as Route}
            className="flex items-center justify-between rounded-2xl border border-[#eee9e3] px-4 py-4 text-sm font-black text-[#1b1c1c]"
          >
            <span className="inline-flex items-center gap-3">
              <ShieldCheck aria-hidden="true" className="size-5 text-[#3620b8]" />
              View privacy policy
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void signOut({ redirectTo: "/sign-in" })}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#eee9e3] px-4 py-4 text-sm font-black text-[#1b1c1c] transition active:scale-95"
          >
            <LogOut aria-hidden="true" className="size-5" />
            Log out
          </button>
        </section>

        <section className="space-y-4 rounded-[2rem] border border-red-200 bg-red-50 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-white text-red-600">
              <Trash2 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-red-950">Danger zone</h2>
              <p className="text-sm font-bold leading-6 text-red-800">
                Deleting your account will remove your portal access and notify Complete Coach.
              </p>
            </div>
          </div>

          <label className="block space-y-2 text-sm font-black text-red-950">
            <span>Type DELETE to confirm account deletion</span>
            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-[#1b1c1c] outline-none focus:border-red-500"
            />
          </label>

          <button
            type="button"
            disabled={deleteConfirmation !== "DELETE" || deleting}
            onClick={() => void handleDelete()}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-black uppercase transition active:scale-95",
              deleteConfirmation === "DELETE" && !deleting
                ? "bg-red-600 text-white"
                : "cursor-not-allowed bg-red-100 text-red-300"
            )}
          >
            <LockKeyhole aria-hidden="true" className="size-4" />
            {deleting ? "Deleting..." : "Delete my account"}
          </button>
        </section>
      </div>
    </ClientMobileShell>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-black text-[#1b1c1c]">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-[#eee9e3] bg-[#fbf9f8] px-4 py-3 text-sm font-bold text-[#1b1c1c] outline-none transition focus:border-[#3620b8]"
      />
    </label>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Invalid image data."));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}
