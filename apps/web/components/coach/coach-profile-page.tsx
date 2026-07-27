"use client";

import { Mail, Phone, Plus, Upload } from "lucide-react";
import { useState } from "react";

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

export function CoachProfilePage() {
  const [email, setEmail] = useState("m.chen@mcpcoaching.com");
  const [phone, setPhone] = useState("+1 (555) 012-9988");
  const [bio, setBio] = useState(
    "With over 12 years of experience in high-performance sports and specialised metabolic conditioning, Marcus has carved a unique space in the coaching world. He brings world-class methodologies to ambitious professionals who want strong, measurable progress."
  );
  const [philosophy, setPhilosophy] = useState(
    "We do not chase fatigue, we create performance. If it is not measurable, it is not manageable."
  );
  const [specialityInput, setSpecialityInput] = useState("");
  const [specialities, setSpecialities] = useState(["Metabolic Analytics", "Strength Development", "Behavioral Coaching"]);
  const [credentials, setCredentials] = useState<Credential[]>(initialCredentials);

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

    setCredentials([
      ...credentials,
      {
        id: `credential-${Date.now()}`,
        title: `Credential ${credentialNumber}`,
        institution: "",
        completedAt: "",
        credentialId: "",
        fileName: ""
      }
    ]);
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
              {credentials.map((credential) => (
                <section key={credential.id} aria-label={`${credential.title} credential`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
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
                </section>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
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
