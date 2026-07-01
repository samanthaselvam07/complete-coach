"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";

interface ApiEducationResource {
  id: string;
  title: string;
  category: string;
  resourceType: string;
}

interface ResourceCard {
  id: string;
  title: string;
  type: string;
  category: string;
  gradient: string;
}

const resourceGradients = [
  "from-indigo-500 to-purple-600",
  "from-orange-400 to-pink-500",
  "from-emerald-400 to-teal-600",
  "from-slate-700 to-slate-950"
] as const;
const educationTabs = ["All Content", "Training Sessions", "Nutrition Kit", "Member Success", "Video Masterclasses"] as const;

export function EducationPage() {
  const [activeTab, setActiveTab] = useState<(typeof educationTabs)[number]>("All Content");
  const [resources, setResources] = useState<ResourceCard[]>([]);
  const [resourceSource, setResourceSource] = useState<"api" | "unavailable">("unavailable");
  const [loadingResources, setLoadingResources] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadResources() {
      try {
        const response = await fetch("/api/v1/education-resources?limit=100");

        if (!response.ok) {
          throw new Error("Education resources API unavailable.");
        }

        const payload = (await response.json()) as { data?: ApiEducationResource[] };
        const apiResources = Array.isArray(payload.data) ? payload.data : [];

        if (mounted) {
          setResources(apiResources.map(mapApiResourceToCard));
          setResourceSource("api");
        }
      } catch {
        if (mounted) {
          setResources([]);
          setResourceSource("unavailable");
        }
      } finally {
        if (mounted) {
          setLoadingResources(false);
        }
      }
    }

    void loadResources();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredResources = useMemo(() => {
    if (activeTab === "All Content") {
      return resources;
    }

    return resources.filter((resource) => resource.category === activeTab);
  }, [activeTab, resources]);

  return (
    <main className="space-y-8 p-6 lg:p-8">
      {loadingResources ? (
        <CompleteCoachLoadingScreen
          title="Preparing education library"
          label="Preparing education library."
        />
      ) : null}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="mb-3 text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Elevate Your Athletes.
            </span>
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            The definitive hub for performance-boosting material. Distribute training guides, nutrition
            resources, and video tutorials to your clients in one centralized library.
          </p>
        </div>
        <a
          href="/education/add"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create New Resource
        </a>
      </header>

      <nav aria-label="Education resource filters" className="flex flex-wrap gap-3">
        {educationTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-5 py-2.5 text-sm font-bold transition ${
              activeTab === tab
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-orange-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section aria-labelledby="latest-resources-heading">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="latest-resources-heading" className="text-xl font-black">
            Latest Resources
          </h2>
          <div className="flex items-center gap-4 text-sm font-bold text-indigo-600">
            <a href="/education" className="inline-flex items-center gap-1 hover:text-indigo-700">
              View archive
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <span>
              {resourceSource === "api" ? "Synced library" : "No persisted resources"}
            </span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredResources.map((resource) => (
            <article
              key={resource.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300 hover:shadow-lg"
            >
              <div className={`relative h-32 bg-gradient-to-br ${resource.gradient}`}>
                <span className="absolute right-3 top-3 rounded bg-white/90 px-2 py-1 text-xs font-bold text-slate-900">
                  {resource.type}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-950">{resource.title}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{resource.category}</p>
              </div>
            </article>
          ))}
        </div>
        {filteredResources.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No education resources were returned from the database.
          </p>
        ) : null}
      </section>
    </main>
  );
}

function mapApiResourceToCard(resource: ApiEducationResource, index: number): ResourceCard {
  return {
    id: resource.id,
    title: resource.title,
    type: resource.resourceType.toUpperCase(),
    category: resource.category,
    gradient: resourceGradients[index % resourceGradients.length]
  };
}
