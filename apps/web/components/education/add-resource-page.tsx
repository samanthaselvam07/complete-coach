"use client";

import { Check, ChevronLeft, Upload, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { distributionOptions, resourceCategories } from "@/lib/education/education-config";

const resourceTypes = ["article", "video", "pdf", "link", "file"] as const;

type ResourceType = (typeof resourceTypes)[number];

interface UploadUrlResponse {
  objectId: string;
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  resourceType: ResourceType;
}

export function AddResourcePage() {
  const [resourceTitle, setResourceTitle] = useState("");
  const [category, setCategory] = useState<(typeof resourceCategories)[number]>("Training");
  const [resourceType, setResourceType] = useState<ResourceType>("pdf");
  const [externalUrl, setExternalUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [distribution, setDistribution] = useState<string[]>(["Assign to Clients"]);
  const [status, setStatus] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  function addTag() {
    const normalized = newTag.trim();
    if (normalized && !tags.includes(normalized)) {
      setTags([...tags, normalized]);
      setNewTag("");
    }
  }

  function toggleDistribution(label: string) {
    setDistribution((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );
  }

  async function publishResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resourceTitle.trim()) {
      setStatus("Enter a resource title before publishing.");
      return;
    }

    if (!selectedFile && !externalUrl.trim()) {
      setStatus("Attach a file or add a URL before publishing.");
      return;
    }

    setIsPublishing(true);
    setStatus("Publishing resource...");

    try {
      let objectId: string | undefined;
      let persistedResourceType = resourceType;

      if (selectedFile) {
        const uploadResponse = await requestUploadUrl(selectedFile);
        const uploadPutResponse = await fetch(uploadResponse.uploadUrl, {
          method: "PUT",
          headers: uploadResponse.requiredHeaders,
          body: selectedFile
        });

        if (!uploadPutResponse.ok) {
          throw new Error("Education resource upload failed.");
        }

        objectId = uploadResponse.objectId;
        persistedResourceType = uploadResponse.resourceType;
      }

      const createResponse = await fetch("/api/v1/education-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resourceTitle.trim(),
          category,
          resourceType: persistedResourceType,
          ...(objectId ? { objectId } : {}),
          ...(externalUrl.trim() ? { externalUrl: externalUrl.trim() } : {}),
          tags
        })
      });

      if (!createResponse.ok) {
        throw new Error("Education resource creation failed.");
      }

      setResourceTitle("");
      setExternalUrl("");
      setSelectedFile(null);
      setTags([]);
      setStatus("Resource published.");
    } catch {
      setStatus("Could not publish this resource. Check the file type, URL, and storage settings.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <a href="/education" aria-label="Back to education" className="rounded-xl p-2 transition hover:bg-slate-100">
              <ChevronLeft className="h-5 w-5" />
            </a>
            <div>
              <h1 className="text-2xl font-black">Upload New Resource</h1>
              <p className="text-sm text-slate-500">Educational Vault asset builder</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold transition hover:bg-slate-50">
              Manage Resources
            </button>
            <button
              form="education-resource-form"
              type="submit"
              disabled={isPublishing}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Publish as Resource
            </button>
          </div>
        </div>
      </header>

      <form id="education-resource-form" onSubmit={publishResource} className="mx-auto grid max-w-7xl gap-8 p-6 lg:grid-cols-3 lg:p-8">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-black">Upload New Resource</h2>
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Upload className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="mb-2 font-bold">Drag files here to start uploading</h3>
              <p className="mb-4 text-sm text-slate-500">Supports PDF, MP4, MOV, JPG, PNG</p>
              <label className="inline-flex cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold transition hover:bg-slate-50">
                Browse Files
                <input
                  type="file"
                  aria-label="Browse Files"
                  accept=".pdf,.mp4,.mov,.jpg,.jpeg,.png,.webp,application/pdf,video/mp4,video/quicktime,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {selectedFile ? (
                <p className="mt-4 text-sm font-bold text-slate-700">{selectedFile.name}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-black">Resource Metadata</h2>
            <div className="space-y-5">
              <label className="block text-sm font-bold text-slate-700">
                Resource Title
                <input
                  value={resourceTitle}
                  onChange={(event) => setResourceTitle(event.target.value)}
                  placeholder="e.g. Advanced Hypertrophy Principles PDF"
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as typeof category)}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {resourceCategories.map((resourceCategory) => (
                    <option key={resourceCategory}>{resourceCategory}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Resource Type
                <select
                  value={resourceType}
                  onChange={(event) => setResourceType(event.target.value as ResourceType)}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Resource URL
                <input
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                  placeholder="https://example.com/resource"
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <div>
                <label htmlFor="education-tags" className="block text-sm font-bold text-slate-700">
                  Tags
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-sm font-bold text-indigo-700">
                      {tag}
                      <button type="button" aria-label={`Remove ${tag}`} onClick={() => setTags(tags.filter((item) => item !== tag))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    id="education-tags"
                    value={newTag}
                    onChange={(event) => setNewTag(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="hypertrophy, strength, recovery"
                    className="flex-1 rounded-xl border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={addTag} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold transition hover:bg-slate-200">
                    Add Tag
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-black">Distribution</h2>
            <div className="space-y-3">
              {distributionOptions.map((option) => {
                const selected = distribution.includes(option.label);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleDistribution(option.label)}
                    className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                      selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-sm font-bold ${selected ? "text-indigo-700" : "text-slate-900"}`}>{option.label}</span>
                    {selected ? <Check className="h-5 w-5 text-indigo-600" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-black">Live Preview</h2>
            <div className="overflow-hidden rounded-2xl bg-slate-900">
              <div className="h-44 bg-gradient-to-br from-indigo-600 via-purple-600 to-slate-950" />
              <div className="bg-slate-800 p-4">
                <h3 className="font-black text-white">{resourceTitle || "Resource Title"}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {category} - {tags.length} tag{tags.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {status ? (
              <p role="status" className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
                {status}
              </p>
            ) : null}
          </section>
        </aside>
      </form>
    </main>
  );
}

async function requestUploadUrl(file: File) {
  const response = await fetch("/api/v1/education-resources/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      byteSize: file.size
    })
  });

  if (!response.ok) {
    throw new Error("Education resource upload URL creation failed.");
  }

  const payload = (await response.json()) as { data: UploadUrlResponse };

  return payload.data;
}
