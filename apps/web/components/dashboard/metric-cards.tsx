import Link from "next/link";

import { dashboardTeamMembers } from "@/fixtures/dashboard";
import { teamMembers as operationTeamMembers } from "@/fixtures/operations";
import { cn } from "@/lib/utils";

export interface TeamCapacityMember {
  id: string;
  name: string | null;
  role: string;
  status: string;
  activeClientCount: number;
  capacityLimit: number;
  capacityPercent: number;
}

interface ClientCapacityCardProps {
  members?: TeamCapacityMember[];
}

interface PriorityTasksCardProps {
  pendingCheckIns?: number;
}

export function ClientCapacityCard({ members = fallbackCapacityMembers }: ClientCapacityCardProps) {
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
        <span className="rounded bg-indigo-100 px-2 py-1 text-xs text-indigo-700">{capacityPercent}% LOAD</span>
      </div>
      <p className="mb-2 text-sm font-semibold text-gray-700">Team Capacity</p>
      <div className="mb-4">
        <span className="text-3xl font-bold">{activeClients}</span>
        <span className="text-xl text-gray-400">/{capacity}</span>
      </div>
      <div className="mb-2 h-3 w-full rounded-full bg-gray-100">
        <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${capacityPercent}%` }} />
      </div>
      <p className="text-xs text-gray-500">Room for {remainingCapacity} more premium athletes across {coachMembers.length} coaches</p>

      <div className="mt-4 space-y-2">
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
      </div>
    </Link>
  );
}

const fallbackCapacityMembers = operationTeamMembers
  .filter((member) => member.status === "active" && member.clients > 0)
  .map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    status: "active",
    activeClientCount: member.clients,
    capacityLimit: Math.max(Math.round(member.clients / (member.load / 100)), member.clients),
    capacityPercent: member.load
  }));

export function PriorityTasksCard({ pendingCheckIns = 5 }: PriorityTasksCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-500">Check Ins</span>
        <span className="size-2 rounded-full bg-orange-500" aria-label="Needs attention" />
      </div>
      <div className="mb-6">
        <span className="text-3xl font-bold">{pendingCheckIns}</span>
        <span className="text-xl text-gray-400"> Pending</span>
      </div>
      <div className="rounded-lg bg-orange-50 p-3 text-center">
        <div className="mb-1 text-2xl font-bold text-orange-600">{pendingCheckIns}</div>
        <div className="text-xs uppercase tracking-wider text-gray-600">Checks</div>
      </div>
    </section>
  );
}

export function TeamSnapshotCard() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5" aria-label="Coach Team">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Coach Team</h2>
        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
          {dashboardTeamMembers.length} active
        </span>
      </div>
      <div className="flex -space-x-3">
        {dashboardTeamMembers.map((member) => (
          <div
            key={member.id}
            title={`${member.name}, ${member.role}`}
            className={cn(
              "flex size-11 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-sm",
              member.color
            )}
          >
            {member.initials}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">Coverage is balanced across nutrition, care, and performance.</p>
    </section>
  );
}
