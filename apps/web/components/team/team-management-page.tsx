"use client";

import { Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { teamMembers as fixtureTeamMembers } from "@/fixtures/operations";

type TeamRole = "owner" | "admin" | "coach" | "assistant";
type TeamStatus = "invited" | "active" | "suspended" | "removed";

interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: TeamRole;
  status: TeamStatus;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: Exclude<TeamRole, "owner">;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
}

export function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>(() => mapFixtureMembers());
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [source, setSource] = useState<"api" | "fixture">("fixture");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<TeamRole, "owner">>("coach");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTeam() {
      try {
        const response = await fetch("/api/v1/team-members");

        if (!response.ok) {
          throw new Error("Team API unavailable.");
        }

        const payload = (await response.json()) as {
          data: { members: TeamMember[]; invitations: TeamInvitation[] };
        };

        if (active) {
          setMembers(payload.data.members);
          setInvitations(payload.data.invitations);
          setSource("api");
        }
      } catch {
        if (active) {
          setSource("fixture");
        }
      }
    }

    void loadTeam();

    return () => {
      active = false;
    };
  }, []);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members]
  );

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSaving(true);

    try {
      const response = await fetch("/api/v1/team-members/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });

      if (!response.ok) {
        throw new Error("Invitation could not be created.");
      }

      const payload = (await response.json()) as {
        data: { invitation: TeamInvitation };
      };
      setInvitations((current) => [payload.data.invitation, ...current]);
      setInviteOpen(false);
      setInviteEmail("");
      setFeedback(`Invitation created for ${payload.data.invitation.email}.`);
    } catch {
      setFeedback("Invitation could not be created. Check the email and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(member: TeamMember, input: Partial<Pick<TeamMember, "role" | "status">>) {
    setFeedback(null);

    try {
      const response = await fetch(`/api/v1/team-members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error("Team member could not be updated.");
      }

      const payload = (await response.json()) as { data: TeamMember };
      setMembers((current) =>
        current.map((candidate) => (candidate.id === member.id ? payload.data : candidate))
      );
      setFeedback(`${payload.data.name ?? payload.data.email ?? "Team member"} updated.`);
    } catch {
      setFeedback("Team member could not be updated. The last owner cannot be changed.");
    }
  }

  async function removeMember(member: TeamMember) {
    setFeedback(null);

    try {
      const response = await fetch(`/api/v1/team-members/${member.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Team member could not be removed.");
      }

      setMembers((current) => current.filter((candidate) => candidate.id !== member.id));
      setFeedback(`${member.name ?? member.email ?? "Team member"} removed.`);
    } catch {
      setFeedback("Team member could not be removed. The last owner cannot be removed.");
    }
  }

  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-black">Team Management</h1>
          <p className="text-sm text-slate-600">Invite staff and control organization access.</p>
        </div>
        <Button
          type="button"
          onClick={() => setInviteOpen(true)}
          disabled={source !== "api"}
        >
          <UserPlus aria-hidden="true" />
          Invite Member
        </Button>
      </header>

      {feedback ? (
        <p role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {feedback}
        </p>
      ) : null}

      {source === "fixture" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Team management is in read-only fallback mode until the API is available.
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Team summary">
        <SummaryCard icon={Users} label="Active members" value={activeMembers.length} />
        <SummaryCard icon={ShieldCheck} label="Owners and admins" value={activeMembers.filter((member) => member.role === "owner" || member.role === "admin").length} />
        <SummaryCard icon={Mail} label="Pending invitations" value={invitations.length} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black">Team Members</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.filter((member) => member.status !== "removed").map((member) => (
                <tr key={member.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-4">
                    <span className="block font-bold">{member.name ?? "Unnamed member"}</span>
                    <span className="text-slate-500">{member.email}</span>
                  </td>
                  <td className="px-5 py-4">
                    {member.role === "owner" ? (
                      <span className="font-semibold capitalize">{member.role}</span>
                    ) : (
                      <select
                        aria-label={`Role for ${member.name ?? member.email}`}
                        value={member.role}
                        disabled={source !== "api"}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                        onChange={(event) =>
                          void updateMember(member, { role: event.target.value as TeamMember["role"] })
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="coach">Coach</option>
                        <option value="assistant">Assistant</option>
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-4 capitalize">{member.status}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={source !== "api" || member.role === "owner"}
                        onClick={() =>
                          void updateMember(member, {
                            status: member.status === "active" ? "suspended" : "active"
                          })
                        }
                      >
                        {member.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={source !== "api" || member.role === "owner"}
                        onClick={() => void removeMember(member)}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black">Pending Invitations</h2>
        {invitations.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-bold">{invitation.email}</p>
                <p className="text-sm capitalize text-slate-600">{invitation.role}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No pending invitations.</p>
        )}
      </section>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form onSubmit={submitInvitation}>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
              <DialogDescription>
                Invitations expire after seven days and must be accepted by the invited email.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 space-y-4">
              <label className="grid gap-2 text-sm font-semibold">
                Email
                <Input
                  type="email"
                  value={inviteEmail}
                  required
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Role
                <select
                  value={inviteRole}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  onChange={(event) =>
                    setInviteRole(event.target.value as Exclude<TeamRole, "owner">)
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="coach">Coach</option>
                  <option value="assistant">Assistant</option>
                </select>
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon className="mb-3 h-5 w-5 text-indigo-600" aria-hidden="true" />
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </article>
  );
}

function mapFixtureMembers(): TeamMember[] {
  return fixtureTeamMembers.map((member) => ({
    id: member.id,
    userId: member.id,
    name: member.name,
    email: member.email,
    image: null,
    role: member.role.toLowerCase().includes("admin") ? "admin" : "coach",
    status: member.status === "active" ? "active" : "suspended"
  }));
}
