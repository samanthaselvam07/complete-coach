"use client";

import { Bell, Camera, Eye, EyeOff, Shield } from "lucide-react";
import { useEffect, useState } from "react";

const defaultFullName = "Marcus Chen";
const defaultProfessionalTitle = "Head Performance Coach";
const defaultEmail = "marcus.coach@kineticcurator.com";
const defaultPhone = "+1 (055) 234-8890";

export function SettingsPage() {
  const [fullName, setFullName] = useState(defaultFullName);
  const [professionalTitle, setProfessionalTitle] = useState(defaultProfessionalTitle);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [photoFileName, setPhotoFileName] = useState("");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Account changes are ready to save.");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/v1/coach-profile");

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: Partial<AccountProfilePayload> };

        if (!isAccountProfilePayload(payload.data)) {
          return;
        }

        setFullName(payload.data.name || defaultFullName);
        setProfessionalTitle(payload.data.professionalTitle || defaultProfessionalTitle);
        setEmail(payload.data.email || defaultEmail);
        setPhone(payload.data.phone || defaultPhone);
        setPhotoFileName(payload.data.photoFileName || "");
        if (payload.data.photoFileName) {
          await resolvePersistedPhotoPreview(payload.data.photoFileName);
        }
        setSaveStatus("Account profile loaded.");
      } catch {
        setSaveStatus("Account profile could not be loaded. You can still edit and try saving.");
      }
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  async function resolvePersistedPhotoPreview(photoUrl: string) {
    if (!isUploadedAccountPhotoUrl(photoUrl)) {
      setPhotoPreviewUrl(isRenderablePhotoUrl(photoUrl) ? photoUrl : "");
      return;
    }

    try {
      const response = await fetch(`/api/v1/coach-profile/photo-url?photoUrl=${encodeURIComponent(photoUrl)}`);
      const payload = (await response.json()) as { data?: { url?: string } };

      setPhotoPreviewUrl(response.ok && payload.data?.url ? payload.data.url : "");
    } catch {
      setPhotoPreviewUrl("");
    }
  }

  function handlePhotoUpload(file: File | undefined) {
    setSelectedPhotoFile(file ?? null);
    setPhotoFileName(file?.name ?? "");
    setPhotoPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl && currentPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return file ? URL.createObjectURL(file) : "";
    });
  }

  async function saveAccountProfile() {
    setIsSaving(true);
    setSaveStatus("Saving account profile...");

    try {
      const savedPhotoUrl = selectedPhotoFile ? await uploadAccountPhoto(selectedPhotoFile) : photoFileName;
      const response = await fetch("/api/v1/coach-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          professionalTitle,
          email,
          phone,
          photoFileName: savedPhotoUrl
        })
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Account profile could not be saved."));
      }

      setPhotoFileName(savedPhotoUrl);
      setSelectedPhotoFile(null);
      if (isUploadedAccountPhotoUrl(savedPhotoUrl)) {
        await resolvePersistedPhotoPreview(savedPhotoUrl);
      }
      setSaveStatus("Account profile saved.");
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Account profile could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function changePassword() {
    if (password.length < 8) {
      setSaveStatus("Enter a new password with at least 8 characters.");
      return;
    }

    setIsChangingPassword(true);
    setSaveStatus("Changing password...");

    try {
      const response = await fetch("/api/v1/coach-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Password could not be changed."));
      }

      setPassword("");
      setSaveStatus("Password changed.");
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Password could not be changed. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <h1 className="mb-8 text-3xl font-black tracking-tight text-slate-950">Account Profile</h1>

      <section className="mb-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[8rem_1fr]">
          <div>
            <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-200 to-slate-500" aria-label="Profile photo preview">
              {photoPreviewUrl ? (
                <img src={photoPreviewUrl} alt="Profile photo preview" className="h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white">MC</span>
              )}
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">
              <Camera className="h-4 w-4" aria-hidden="true" />
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handlePhotoUpload(event.target.files?.[0])}
              />
            </label>
            {photoFileName ? <p className="mt-2 truncate text-xs font-semibold text-slate-500">{photoFileName}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ProfileInput label="Full Name" value={fullName} onChange={setFullName} />
            <ProfileInput label="Professional Title" value={professionalTitle} onChange={setProfessionalTitle} />
            <ProfileInput label="Email Address" type="email" value={email} onChange={setEmail} />
            <ProfileInput label="Phone Number" type="tel" value={phone} onChange={setPhone} />
          </div>
        </div>
      </section>

      <div className="mb-6 grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-slate-950">
            <Shield className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Security & Access
          </h2>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
            New password
            <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium normal-case tracking-normal text-slate-950 outline-none"
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </span>
          </label>
          <button
            type="button"
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isChangingPassword}
            onClick={() => void changePassword()}
          >
            {isChangingPassword ? "Changing..." : "Change password"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-slate-950">
            <Bell className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Notifications
          </h2>
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Client Activity</p>
          <ToggleRow label="New Check-In Uploaded" enabled />
          <ToggleRow label="Messages from Clients" enabled />
          <p className="mb-4 mt-8 text-xs font-bold uppercase tracking-widest text-slate-500">System Updates</p>
          <ToggleRow label="Platform Maintenance" enabled />
          <ToggleRow label="Subscription Renewals" enabled={false} />
        </section>
      </div>

      <div className="mt-6 flex max-w-5xl justify-end gap-3">
        <button type="button" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold">
          Discard Changes
        </button>
        <button
          type="button"
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void saveAccountProfile()}
        >
          {isSaving ? "Saving..." : "Save account profile"}
        </button>
      </div>
      <p role="status" className="mt-3 max-w-5xl text-right text-sm font-semibold text-slate-500">{saveStatus}</p>
    </main>
  );
}

interface AccountProfilePayload {
  name: string;
  professionalTitle: string;
  email: string;
  phone: string;
  photoFileName: string;
}

async function uploadAccountPhoto(file: File) {
  const response = await fetch("/api/v1/coach-profile/photo-upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Filename": encodeURIComponent(file.name)
    },
    body: file
  });
  const payload = (await response.json().catch(() => null)) as { data?: { photoUrl?: string }; error?: { message?: string } } | null;

  if (!response.ok || !payload?.data?.photoUrl) {
    throw new Error(payload?.error?.message ?? "Account photo could not be uploaded.");
  }

  return payload.data.photoUrl;
}

function isUploadedAccountPhotoUrl(value: string) {
  return value.startsWith("r2://")
    && value.includes("/account/photos/")
    && /\.(?:heic|heif|jpe?g|png|webp)$/iu.test(value);
}

function isRenderablePhotoUrl(value: string) {
  return /^https?:\/\//u.test(value) && /\.(?:avif|gif|heic|heif|jpe?g|png|webp)(?:[?#].*)?$/iu.test(value);
}

function isAccountProfilePayload(value: unknown): value is AccountProfilePayload {
  return typeof value === "object" && value !== null && "email" in value;
}

async function getApiErrorMessage(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

  return payload?.error?.message ?? fallbackMessage;
}

function ProfileInput({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "email" | "tel" | "text";
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-xs font-bold uppercase tracking-widest text-slate-500" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        value={value}
        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ToggleRow({ label, detail, enabled }: { label: string; detail?: string; enabled: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-slate-700">{label}</p>
        {detail ? <p className="text-xs text-slate-400">{detail}</p> : null}
      </div>
      <span className={`h-6 w-11 rounded-full p-1 ${enabled ? "bg-indigo-600" : "bg-slate-200"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white ${enabled ? "translate-x-5" : ""}`} />
      </span>
    </div>
  );
}
