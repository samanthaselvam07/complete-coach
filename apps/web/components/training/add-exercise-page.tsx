"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Minus, Plus, Upload } from "lucide-react";
import { useState } from "react";

import { SavedToast } from "@/components/ui/saved-toast";
import { muscleGroups } from "@/fixtures/training";
import { cn } from "@/lib/utils";

export function AddExercisePage() {
  const router = useRouter();
  const [exerciseName, setExerciseName] = useState("");
  const [category, setCategory] = useState("Compound");
  const [equipment, setEquipment] = useState("Dumbbells");
  const [sets, setSets] = useState(3);
  const [targetReps, setTargetReps] = useState([8, 12]);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(["Chest", "Shoulders"]);
  const [coachingCues, setCoachingCues] = useState([
    "Retract scapula",
    "Drive elbows to hips",
    "Control eccentric phase"
  ]);
  const [newCue, setNewCue] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoObjectKey, setVideoObjectKey] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles((currentMuscles) =>
      currentMuscles.includes(muscle)
        ? currentMuscles.filter((currentMuscle) => currentMuscle !== muscle)
        : [...currentMuscles, muscle]
    );
  };

  const updateTargetRepRange = (rangeIndex: 0 | 1, rawValue: string) => {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    const nextValue = Math.max(1, Math.min(50, parsedValue));

    setTargetReps(([lowerRange, upperRange]) =>
      rangeIndex === 0
        ? [Math.min(nextValue, upperRange), upperRange]
        : [lowerRange, Math.max(nextValue, lowerRange)]
    );
  };

  const addCoachingCue = () => {
    const trimmedCue = newCue.trim();

    if (!trimmedCue) {
      return;
    }

    setCoachingCues((currentCues) => [...currentCues, trimmedCue]);
    setNewCue("");
  };

  const saveExercise = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: exerciseName,
          category,
          equipment,
          primaryMuscles: selectedMuscles,
          difficulty: "intermediate",
          defaultSets: sets,
          defaultReps: `${targetReps[0]}-${targetReps[1]}`,
          defaultRestSeconds: 120,
          videoObjectKey: videoObjectKey ?? undefined,
          executionCues: coachingCues
        })
      });

      if (!response.ok) {
        throw new Error("Exercise save failed.");
      }

      router.push("/training/exercises");
    } catch {
      setErrorMessage("Exercise could not be saved. Check the details and try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadVideo = async (file: File) => {
    setUploadingVideo(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const signedUrlResponse = await fetch("/api/v1/exercises/media-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "video",
          filename: file.name,
          contentType: file.type,
          byteSize: file.size
        })
      });
      const signedUrlPayload = await signedUrlResponse.json();

      if (!signedUrlResponse.ok) {
        throw new Error(signedUrlPayload.error?.message ?? "Video upload could not be authorized.");
      }

      const uploadResponse = await fetch(signedUrlPayload.data.uploadUrl, {
        method: "PUT",
        headers: signedUrlPayload.data.requiredHeaders,
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Video upload failed.");
      }

      setVideoObjectKey(signedUrlPayload.data.objectKey);
      setVideoFilename(file.name);
      setStatusMessage("Exercise video uploaded and ready to save.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Exercise video could not be uploaded.");
    } finally {
      setUploadingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/training/exercises" aria-label="Back to exercise database" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Link>
            <h1 className="text-2xl font-bold">Add New Exercise</h1>
          </div>
          <button
            type="button"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            onClick={saveExercise}
          >
            {saving ? "Saving..." : "Save Exercise"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <CardHeader icon="N" title="Exercise Basics" tone="bg-purple-100 text-purple-600" />
              <div className="space-y-4">
                <div>
                  <label htmlFor="exercise-name" className="mb-2 block text-sm font-medium text-gray-700">
                    Exercise Name
                  </label>
                  <input
                    id="exercise-name"
                    type="text"
                    value={exerciseName}
                    placeholder="e.g. Incline DB Press"
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(event) => setExerciseName(event.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="exercise-category" className="mb-2 block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="exercise-category"
                      value={category}
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      <option>Compound</option>
                      <option>Isolation</option>
                      <option>Cardio</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="exercise-equipment" className="mb-2 block text-sm font-medium text-gray-700">
                      Equipment
                    </label>
                    <select
                      id="exercise-equipment"
                      value={equipment}
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onChange={(event) => setEquipment(event.target.value)}
                    >
                      <option>Dumbbells</option>
                      <option>Barbell</option>
                      <option>Machine</option>
                      <option>Cable</option>
                      <option>Bodyweight</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
                <strong>Keep naming precise and clear</strong> to maintain searchability across clients.
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6" aria-label="Anatomy Filter">
              <CardHeader icon="T" title="Anatomy Filter" tone="bg-blue-100 text-blue-600" />
              <p className="mb-4 text-sm text-gray-600">Filter anatomical targets for precise protocols</p>
              <div className="flex flex-wrap gap-2">
                {muscleGroups.map((muscle) => (
                  <button
                    key={muscle}
                    type="button"
                    aria-pressed={selectedMuscles.includes(muscle)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-all",
                      selectedMuscles.includes(muscle)
                        ? muscle === "Chest"
                          ? "bg-blue-600 text-white"
                          : muscle === "Shoulders"
                            ? "bg-orange-500 text-white"
                            : "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                    onClick={() => toggleMuscle(muscle)}
                  >
                    {muscle}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <CardHeader icon="V" title="Volume Defaults" tone="bg-purple-100 text-purple-600" />
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700">Sets</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      aria-label="Decrease sets"
                      className="flex size-10 items-center justify-center rounded-lg bg-gray-100 transition-colors hover:bg-gray-200"
                      onClick={() => setSets((currentSets) => Math.max(1, currentSets - 1))}
                    >
                      <Minus className="size-4 text-gray-600" aria-hidden="true" />
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-3xl font-bold text-gray-900">{sets}</div>
                      <div className="mt-2 text-xs uppercase tracking-wider text-gray-500">Sets Per WO</div>
                    </div>
                    <button
                      type="button"
                      aria-label="Increase sets"
                      className="flex size-10 items-center justify-center rounded-lg bg-gray-100 transition-colors hover:bg-gray-200"
                      onClick={() => setSets((currentSets) => currentSets + 1)}
                    >
                      <Plus className="size-4 text-gray-600" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Target Reps</p>
                    <span className="text-sm font-bold text-gray-900">
                      {targetReps[0]} - {targetReps[1]}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label htmlFor="target-reps-lower" className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Lower range
                      <input
                        id="target-reps-lower"
                        type="number"
                        min="1"
                        max="50"
                        value={targetReps[0]}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onChange={(event) => updateTargetRepRange(0, event.target.value)}
                      />
                    </label>
                    <label htmlFor="target-reps-upper" className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Upper range
                      <input
                        id="target-reps-upper"
                        type="number"
                        min="1"
                        max="50"
                        value={targetReps[1]}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onChange={(event) => updateTargetRepRange(1, event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <CardHeader icon="M" title="Video Demonstration" tone="bg-indigo-100 text-indigo-600" />
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/50">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-indigo-100">
                  <Upload className="size-8 text-indigo-600" aria-hidden="true" />
                </div>
                <h2 className="mb-2 font-semibold text-gray-900">Upload Exercise Video</h2>
                <p className="mb-4 text-sm text-gray-500">Maximum size 500MB - MP4, MOV</p>
                <label className="inline-flex cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  <span>{uploadingVideo ? "UPLOADING..." : "SELECT FILE"}</span>
                  <input
                    type="file"
                    aria-label="Exercise video file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="sr-only"
                    disabled={uploadingVideo}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void uploadVideo(file);
                      }
                    }}
                  />
                </label>
                {videoFilename ? (
                  <p className="mt-3 text-xs font-medium text-emerald-700">{videoFilename} uploaded.</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <CardHeader icon="C" title="Coaching Cues/Notes" tone="bg-green-100 text-green-600" />
              <div className="mb-4 space-y-2">
                {coachingCues.map((cue, index) => (
                  <div key={`${cue}-${index}`} className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-indigo-600 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <span className="flex-1 text-sm text-gray-700">{cue}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <label htmlFor="new-coaching-cue" className="sr-only">
                  New coaching cue
                </label>
                <input
                  id="new-coaching-cue"
                  type="text"
                  value={newCue}
                  placeholder="Add a new coaching cue..."
                  className="flex-1 rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={(event) => setNewCue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      addCoachingCue();
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label="Add coaching cue"
                  className="rounded-lg bg-indigo-600 px-4 py-3 text-white transition-colors hover:bg-indigo-700"
                  onClick={addCoachingCue}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {statusMessage ? <SavedToast message={statusMessage} /> : null}
          {errorMessage ? (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <button
            type="button"
            disabled={saving}
            className="inline-flex rounded-lg bg-indigo-600 px-8 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
            onClick={saveExercise}
          >
            {saving ? "Saving..." : "Save Exercise"}
          </button>
        </div>
      </main>
    </div>
  );
}

function CardHeader({ icon, title, tone }: { icon: string; title: string; tone: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className={cn("flex size-8 items-center justify-center rounded-lg", tone)}>
        <span className="text-sm font-bold">{icon}</span>
      </div>
      <h2 className="font-bold text-gray-900">{title}</h2>
    </div>
  );
}
