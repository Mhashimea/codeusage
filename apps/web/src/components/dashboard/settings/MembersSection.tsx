"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, MoreHorizontal, Mail, Clock, Copy, Check, X } from "lucide-react";
import type { MemberRole } from "@/lib/db/schema";

interface Member {
  id: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  role: MemberRole;
  joined_at: Date;
}

interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  status: string;
  expires_at: Date;
  created_at: Date;
  invited_by_name: string | null;
}

interface MembersSectionProps {
  workspaceId: string;
  userRole: MemberRole | null;
  currentUserId: string;
}

export function MembersSection({ workspaceId, userRole, currentUserId }: MembersSectionProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  const isAdmin = userRole === "admin" || userRole === "owner";

  useEffect(() => {
    fetchMembers();
    if (isAdmin) {
      fetchInvitations();
    }
  }, [workspaceId, isAdmin]);

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/v1/members");
      const data = await response.json();
      if (response.ok) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/v1/invitations");
      const data = await response.json();
      if (response.ok) {
        setInvitations(data.invitations);
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    setInviteError("");

    try {
      const response = await fetch("/api/v1/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || "Failed to send invitation");
        return;
      }

      // Copy invite URL to clipboard
      if (data.inviteUrl) {
        const fullUrl = `${window.location.origin}${data.inviteUrl}`;
        await navigator.clipboard.writeText(fullUrl);
        setCopiedInvite(data.invitation.id);
        setTimeout(() => setCopiedInvite(null), 3000);
      }

      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      fetchInvitations();
    } catch (error) {
      setInviteError("Something went wrong");
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await fetch(`/api/v1/invitations/${invitationId}`, { method: "DELETE" });
      fetchInvitations();
    } catch (error) {
      console.error("Failed to revoke invitation:", error);
    }
  };

  const handleChangeRole = async (userId: string, newRole: MemberRole) => {
    try {
      await fetch(`/api/v1/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      fetchMembers();
    } catch (error) {
      console.error("Failed to change role:", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await fetch(`/api/v1/members/${userId}`, { method: "DELETE" });
      fetchMembers();
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const getRoleBadgeVariant = (role: MemberRole) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>
            Manage your workspace members and invitations
          </CardDescription>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="h-4 w-4 mr-2" />
              Invite
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your workspace
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Admins can invite members and manage settings
                  </p>
                </div>
                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                  {inviting ? "Sending..." : "Send invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Members List */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No members yet</div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.user.name || member.user.email}</span>
                      <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize text-xs">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                {isAdmin && member.role !== "owner" && member.user.id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role === "member" && (
                        <DropdownMenuItem onClick={() => handleChangeRole(member.user.id, "admin")}>
                          Make admin
                        </DropdownMenuItem>
                      )}
                      {member.role === "admin" && (
                        <DropdownMenuItem onClick={() => handleChangeRole(member.user.id, "member")}>
                          Remove admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleRemoveMember(member.user.id)}
                      >
                        Remove from workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pending Invitations */}
        {isAdmin && invitations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Invitations
            </h4>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between py-2 px-2 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{invitation.email}</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {invitation.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    title="Revoke invitation"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
