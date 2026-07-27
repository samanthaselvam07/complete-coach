"use client";

import { Mail, Pencil, Phone, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";

interface Credential {
  id: string;
  title: string;
  institution: string;
  completedAt: string;
  credentialId: string;
  fileName: string;
}

const initialCredentials: Credential[] = [
  {
    id: "credential-cscs",
    title: "CSCS",
    institution: "NSCA",
    completedAt: "2018-05-14",
    credentialId: "CSCS-88421",
    fileName: ""
  },
  {
    id: "credential-pn2",
    title: "PN Level 2",
    institution: "Precision Nutrition",
    completedAt: "2020-09-02",
    credentialId: "PN2-19388",
    fileName: ""
  }
];
const defaultEmail = "m.chen@mcpcoaching.com";
const defaultPhone = "+1 (555) 012-9988";
const defaultBio =
  "With over 12 years of experience in high-performance sports and specialised metabolic conditioning, Marcus has carved a unique space in the coaching world. He brings world-class methodologies to ambitious professionals who want strong, measurable progress.";
const defaultPhilosophy = "We do not chase fatigue, we create performance. If it is not measurable, it is not manageable.";
const defaultSpecialities = ["Metabolic Analytics", "Strength Development", "Behavioral Coaching"];

export function CoachProfilePage() {
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [bio, setBio] = useState(defaultBio);
  const [philosophy, setPhilosophy] = useState(defaultPhilosophy);
  const [specialityInput, setSpecialityInput] = useState("");
  const [specialities, setSpecialities] = useState(defaultSpecialities);
  const [credentials, setCredentials] = useState<Credential[]>(initialCredentials);
  const [editingCredentialIds, setEditingCredentialIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState("Profile changes are ready to save.");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/v1/coach-profile");

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: Partial<CoachProfilePayload> };

        if (!isCoachProfilePayload(payload.data)) {
          return;
        }

        setEmail(payload.data.email || defaultEmail);
        setPhone(payload.data.phone || defaultPhone);
        setBio(payload.data.bio || defaultBio);
        setPhilosophy(payload.data.philosophy || defaultPhilosophy);
        setSpecialities(payload.data.specialities.length > 0 ? payload.data.specialities : defaultSpecialities);
        setCredentials(payload.data.credentials.length > 0 ? payload.data.credentials : initialCredentials);
        setEditingCredentialIds(new Set());
        setSaveStatus("Profile loaded.");
      } catch {
        setSaveStatus("Profile could not be loaded. You can still edit and try saving.");
      }
    }

    void loadProfile();
  }, []);

  function addSpeciality() {
    const nextSpeciality = specialityInput.trim();

    if (!nextSpeciality || specialities.includes(nextSpeciality)) {
      setSpecialityInput("");
      return;
    }

    setSpecialities([...specialities, nextSpeciality]);
    setSpecialityInput("");
  }

  function updateCredential(credentialId: string, updates: Partial<Credential>) {
    setCredentials((currentCredentials) =>
      currentCredentials.map((credential) => (credential.id === credentialId ? { ...credential, ...updates } : credential))
    );
  }

  function addCredential() {
    const credentialNumber = credentials.length + 1;
    const credentialId = `credential-${Date.now()}`;

    setCredentials([
      ...credentials,
      {
        id: credentialId,
        title: `Credential ${credentialNumber}`,
        institution: "",
        completedAt: "",
        credentialId: "",
        fileName: ""
      }
    ]);
    setEditingCredentialIds((currentIds) => new Set([...currentIds, credentialId]));
  }

  function editCredential(credentialId: string) {
    setEditingCredentialIds((currentIds) => new Set([...currentIds, credentialId]));
  }

  function deleteCredential(credentialId: string) {
    setCredentials((currentCredentials) => currentCredentials.filter((credential) => credential.id !== credentialId));
    setEditingCredentialIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(credentialId);

      return nextIds;
    });
  }

  async function saveCoachProfile() {
    setIsSaving(true);
    setSaveStatus("Saving coach profile...");

    try {
      const response = await fetch("/api/v1/coach-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          bio,
          philosophy,
          specialities,
          credentials
        })
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Coach profile could not be saved."));
      }

      setEditingCredentialIds(new Set());
      setSaveStatus("Coach profile saved.");
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Coach profile could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="relative min-h-64 overflow-hidden bg-slate-950 p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(120deg,rgba(15,23,42,0.05),rgba(15,23,42,0.9))]" />
        <div className="relative flex min-h-48 flex-col justify-end">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-200">Master Level Coach</p>
          <h1 className="text-4xl font-black tracking-tight">Marcus Chen-Patterson</h1>
          <p className="mt-2 text-lg font-semibold">Head Performance Coach | MCP Coaching</p>
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[0.48fr_1fr] lg:p-8">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-black">Contact Information</h2>
            <label className="mb-4 block text-sm font-bold text-slate-700">
              Email address
              <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </span>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Phone number
              <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  type="tel"
                  value={phone}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none"
                  onChange={(event) => setPhone(event.target.value)}
                />
              </span>
            </label>
          </section>

          <section className="rounded-2xl bg-slate-950 p-6 text-white">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              Coaching Philosophy
              <textarea
                value={philosophy}
                rows={5}
                className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold normal-case leading-6 text-white outline-none placeholder:text-slate-400 focus:border-indigo-300"
                onChange={(event) => setPhilosophy(event.target.value)}
              />
            </label>
          </section>
        </aside>

        <section className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block text-xl font-black text-slate-950">
              Professional Bio
              <textarea
                value={bio}
                rows={7}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal leading-7 text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                onChange={(event) => setBio(event.target.value)}
              />
            </label>

            <div className="mt-5">
              <label className="block text-sm font-bold text-slate-800">
                Speciality tags
                <span className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={specialityInput}
                    placeholder="Add a speciality"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-950 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    onChange={(event) => setSpecialityInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSpeciality();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"
                    onClick={addSpeciality}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add tag
                  </button>
                </span>
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {specialities.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-label={`Remove ${tag}`}
                    className="rounded-full bg-indigo-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-100"
                    onClick={() => setSpecialities(specialities.filter((speciality) => speciality !== tag))}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Certifications & Credentials</h2>
                <p className="mt-1 text-sm text-slate-500">Upload records and capture the institution, completion date, and credential details.</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"
                onClick={addCredential}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add credential
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {credentials.map((credential) => {
                const credentialTitle = credential.title.trim() || "Untitled credential";
                const credentialInstitution = credential.institution.trim() || "Institution not set";
                const isEditingCredential = editingCredentialIds.has(credential.id);

                return (
                  <section key={credential.id} aria-label={`${credentialTitle} credential`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    {isEditingCredential ? (
                      <>
                        <div className="mb-4 flex justify-end">
                          <button
                            type="button"
                            aria-label={`Delete ${credentialTitle} credential`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
                            onClick={() => deleteCredential(credential.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <EditableField label="Credential title" value={credential.title} onChange={(title) => updateCredential(credential.id, { title })} />
                          <EditableField label="Institution" value={credential.institution} onChange={(institution) => updateCredential(credential.id, { institution })} />
                          <EditableField
                            label="Date completed"
                            type="date"
                            value={credential.completedAt}
                            onChange={(completedAt) => updateCredential(credential.id, { completedAt })}
                          />
                          <EditableField label="Credential ID" value={credential.credentialId} onChange={(credentialId) => updateCredential(credential.id, { credentialId })} />
                        </div>
                        <label className="mt-4 flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-indigo-200 bg-white p-4 text-sm font-bold text-indigo-700 sm:flex-row sm:items-center sm:justify-between">
                          <span className="inline-flex items-center gap-2">
                            <Upload className="h-4 w-4" aria-hidden="true" />
                            Upload certificate
                          </span>
                          <span className="truncate text-xs font-semibold text-slate-500">{credential.fileName || "No file uploaded"}</span>
                          <input
                            type="file"
                            className="sr-only"
                            onChange={(event) => updateCredential(credential.id, { fileName: event.target.files?.[0]?.name ?? "" })}
                          />
                        </label>
                      </>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-700">
                            {credentialTitle}
                          </span>
                          <span className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 ring-1 ring-slate-200">
                            {credentialInstitution}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label={`Edit ${credentialTitle} credential`}
                            className="inline-flex items-center justify-center rounded-xl bg-white p-2 text-slate-500 ring-1 ring-slate-200 hover:text-indigo-600"
                            onClick={() => editCredential(credential.id)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${credentialTitle} credential`}
                            className="inline-flex items-center justify-center rounded-xl bg-rose-50 p-2 text-rose-500 ring-1 ring-rose-100 hover:bg-rose-100"
                            onClick={() => deleteCredential(credential.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </article>
        </section>
      </div>
      <div className="flex flex-col gap-3 px-6 pb-8 lg:px-8">
        <p role="status" className="text-sm font-semibold text-slate-500">{saveStatus}</p>
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void saveCoachProfile()}
          >
            {isSaving ? "Saving..." : "Save coach profile"}
          </button>
        </div>
      </div>
    </main>
  );
}

interface CoachProfilePayload {
  email: string;
  phone: string;
  bio: string;
  philosophy: string;
  specialities: string[];
  credentials: Credential[];
}

function isCoachProfilePayload(value: unknown): value is CoachProfilePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "specialities" in value &&
    Array.isArray((value as { specialities?: unknown }).specialities) &&
    "credentials" in value &&
    Array.isArray((value as { credentials?: unknown }).credentials)
  );
}

async function getApiErrorMessage(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

  return payload?.error?.message ?? fallbackMessage;
}

function EditableField({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "text";
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-950 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
