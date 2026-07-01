import Link from "next/link";

export interface TeamCapacityMember {
  id: string;
  userId?: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  status: string;
  activeClientCount: number;
  capacityLimit: number;
  capacityPercent: number;
}

interface ClientCapacityCardProps {
  members?: TeamCapacityMember[];
  loading?: boolean;
}

interface PriorityTasksCardProps {
  pendingCheckIns?: number;
  loading?: boolean;
}

interface TodaysCheckInsCardProps {
  weekday: string;
  clients: Array<{ id: string; name: string; checkInDay: string }>;
  loading?: boolean;
}

export function ClientCapacityCard({ members = fallbackCapacityMembers, loading = false }: ClientCapacityCardProps) {
  const coachMembers = members.filter((member) => member.status === "active" && member.capacityLimit > 0);
  const activeClients = coachMembers.reduce((total, member) => total + member.activeClientCount, 0);
  const capacity = coachMembers.reduce((total, member) => total + member.capacityLimit, 0);
  const capacityPercent = capacity > 0 ? Math.min(Math.round((activeClients / capacity) * 100), 100) : 0;
  const remainingCapacity = Math.max(capacity - activeClients, 0);
  const visibleMembers = [...coachMembers]
    .sort((firstMember, secondMember) => secondMember.capacityPercent - firstMember.capacityPercent)
    .slice(0, 3);

  return (
    <Link
      href="/clients"
      aria-label="Client Capacity - view client roster"
      className="block rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-500">Client Capacity</span>
        <span className="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700">{loading ? "Syncing" : `${capacityPercent}% LOAD`}</span>
      </div>
      <p className="mb-2 text-sm font-semibold text-gray-700">Team Capacity</p>
      {loading ? (
        <CardLoadingState label="Preparing team capacity." />
      ) : (
        <>
          <div className="mb-4">
            <span className="text-3xl font-bold">{activeClients}</span>
            <span className="text-xl text-gray-400">/{capacity}</span>
          </div>
          <div className="mb-2 h-3 w-full rounded-full bg-gray-100">
            <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${capacityPercent}%` }} />
          </div>
          <p className="text-xs text-gray-500">Room for {remainingCapacity} more premium athletes across {coachMembers.length} coaches</p>
        </>
      )}

      {!loading ? <div className="mt-4 space-y-2">
        {visibleMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-800">{member.name ?? "Unnamed coach"}</p>
              <p className="capitalize text-gray-400">{member.role}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-800">{member.activeClientCount}/{member.capacityLimit}</p>
              <p className="text-gray-400">{member.capacityPercent}%</p>
            </div>
          </div>
        ))}
      </div> : null}
    </Link>
  );
}

const fallbackCapacityMembers: TeamCapacityMember[] = [];

export function PriorityTasksCard({ pendingCheckIns = 0, loading = false }: PriorityTasksCardProps) {
  const checkInLabel = pendingCheckIns === 1 ? "Check In" : "Check Ins";

  return (
    <Link
      href="/clients/check-ins"
      aria-label={`View client check-ins - ${pendingCheckIns} ${checkInLabel}`}
      className="block rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-orange-200 hover:shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-500">Check Ins</span>
        <span className="size-2 rounded-full bg-orange-500" aria-label="Needs attention" />
      </div>
      <div className="rounded-lg bg-orange-50 p-3 text-center">
        {loading ? (
          <CardLoadingState label="Preparing check-ins." />
        ) : (
          <>
            <div className="mb-1 text-2xl font-bold text-orange-600">{pendingCheckIns}</div>
            <div className="text-xs uppercase tracking-wider text-gray-600">{checkInLabel}</div>
          </>
        )}
      </div>
    </Link>
  );
}

export function TodaysCheckInsCard({ weekday, clients, loading = false }: TodaysCheckInsCardProps) {
  const clientCount = clients.length;
  const clientLabel = clientCount === 1 ? "Client" : "Clients";
  const previewNames = clients.slice(0, 3).map((client) => client.name).join(", ");
  const remainingCount = Math.max(clientCount - 3, 0);
  const previewText =
    clientCount === 0
      ? "No assigned check-ins today."
      : `${previewNames}${remainingCount > 0 ? ` +${remainingCount} more` : ""}`;

  return (
    <Link
      href="/clients/check-ins"
      aria-label={`Today's expected check-ins - ${clientCount} ${clientLabel}`}
      className="block rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-500">Today&apos;s Expected Check Ins</span>
        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{weekday}</span>
      </div>
      <p className="mb-2 text-sm font-semibold text-gray-700">{weekday} Check-Ins</p>
      {loading ? (
        <CardLoadingState label="Preparing client check-in schedule." />
      ) : (
        <>
          <div className="mb-2">
            <span className="text-3xl font-bold text-blue-600">{clientCount}</span>
            <span className="ml-2 text-sm text-gray-500">{clientLabel}</span>
          </div>
          <p className="text-xs text-gray-500">{previewText}</p>
        </>
      )}
    </Link>
  );
}

interface TeamSnapshotCardProps {
  members?: TeamCapacityMember[];
  loading?: boolean;
}

const coachAvatarColors = ["bg-indigo-600", "bg-orange-500", "bg-slate-900"];

export function TeamSnapshotCard({ members = fallbackCapacityMembers, loading = false }: TeamSnapshotCardProps) {
  const coachMembers = members
    .filter((member) => member.status === "active" && member.capacityLimit > 0)
    .sort((firstMember, secondMember) => secondMember.capacityPercent - firstMember.capacityPercent);
  const visibleMembers = coachMembers.slice(0, 3);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5" aria-label="Coaching Team">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Coaching Team</h2>
          <p className="text-xs text-gray-500">{loading ? "Syncing coaching team" : `${coachMembers.length} active coaches`}</p>
        </div>
        <Link href="/team-management" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all coaches
        </Link>
      </div>

      {loading ? (
        <CardLoadingState label="Preparing coaching team." />
      ) : <div className="space-y-3">
        {visibleMembers.map((member, index) => (
          <div key={member.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${coachAvatarColors[index % coachAvatarColors.length]}`}
              >
                {getInitials(member.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{member.name ?? "Unnamed coach"}</p>
                    <p className="truncate text-xs capitalize text-gray-500">{member.role}</p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-gray-700">
                    {member.activeClientCount}/{member.capacityLimit}
                  </p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                  <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${member.capacityPercent}%` }} />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <Link href={`/coach-profile?member=${member.id}`} aria-label={`Open profile for ${member.name ?? "coach"}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                    Profile
                  </Link>
                  <Link href={`/team-management?member=${member.id}`} aria-label={`Open settings for ${member.name ?? "coach"}`} className="font-medium text-gray-600 hover:text-gray-900">
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>}

      {!loading ? <p className="mt-4 text-xs text-gray-500">Showing the three coaches closest to capacity.</p> : null}
    </section>
  );
}

function CardLoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2 rounded-lg bg-gray-50 px-3 py-4">
      <span className="sr-only">{label}</span>
      <div className="h-3 w-3/4 animate-pulse rounded-full bg-gray-200" aria-hidden="true" />
      <div className="h-3 w-1/2 animate-pulse rounded-full bg-gray-100" aria-hidden="true" />
      <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-indigo-100" aria-hidden="true" />
    </div>
  );
}

function getInitials(name: string | null) {
  if (!name) {
    return "CC";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
