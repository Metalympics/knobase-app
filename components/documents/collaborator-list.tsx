"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Eye, MessageSquare, Edit3, UserX, Crown } from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  type: "human" | "agent";
  accessLevel: "view" | "comment" | "edit" | "admin";
  lastActive?: string;
}

interface CollaboratorListProps {
  collaborators: Collaborator[];
  ownerId: string;
  currentUserId: string;
  currentUserAccess: "view" | "comment" | "edit" | "admin";
  onUpdateAccess?: (userId: string, accessLevel: "view" | "comment" | "edit" | "admin") => Promise<void>;
  onRemove?: (userId: string) => Promise<void>;
  showLastActive?: boolean;
}

const accessLevels = [
  { value: "view", label: "Can view", icon: Eye },
  { value: "comment", label: "Can comment", icon: MessageSquare },
  { value: "edit", label: "Can edit", icon: Edit3 },
  { value: "admin", label: "Admin", icon: Shield },
] as const;

export function CollaboratorList({
  collaborators,
  ownerId,
  currentUserId,
  currentUserAccess,
  onUpdateAccess,
  onRemove,
  showLastActive = true,
}: CollaboratorListProps) {
  const isAdmin = currentUserAccess === "admin" || currentUserId === ownerId;

  const canManage = (targetId: string, targetAccess: string) => {
    if (currentUserId === ownerId) return targetId !== ownerId;
    if (currentUserId === targetId) return false;
    if (targetAccess === "admin") return false;
    return isAdmin;
  };

  const getAccessIcon = (level: string) => {
    switch (level) {
      case "admin":
        return <Shield className="h-3 w-3" />;
      case "edit":
        return <Edit3 className="h-3 w-3" />;
      case "comment":
        return <MessageSquare className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  const getAccessColor = (level: string) => {
    switch (level) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "edit":
        return "bg-green-100 text-green-700 border-green-200";
      case "comment":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const formatLastActive = (date?: string) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  // Sort: Owner first, then admins, then by name
  const sortedCollaborators = [...collaborators].sort((a, b) => {
    if (a.id === ownerId) return -1;
    if (b.id === ownerId) return 1;
    const accessOrder = { admin: 0, edit: 1, comment: 2, view: 3 };
    if (accessOrder[a.accessLevel] !== accessOrder[b.accessLevel]) {
      return accessOrder[a.accessLevel] - accessOrder[b.accessLevel];
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-2">
      {sortedCollaborators.map((collaborator) => {
        const isOwner = collaborator.id === ownerId;
        const canManageThis = canManage(collaborator.id, collaborator.accessLevel);

        return (
          <div
            key={collaborator.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={collaborator.avatar} />
                  <AvatarFallback className={collaborator.type === "agent" ? "bg-purple-100 text-purple-700" : ""}>
                    {collaborator.type === "agent" ? "🤖" : collaborator.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOwner && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                    <Crown className="h-3 w-3 text-yellow-900" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{collaborator.name}</span>
                  {collaborator.type === "agent" && (
                    <Badge variant="secondary" className="text-xs">Agent</Badge>
                  )}
                  {collaborator.id === currentUserId && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
                {collaborator.email && (
                  <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                )}
                {showLastActive && collaborator.lastActive && (
                  <p className="text-xs text-muted-foreground">
                    Active {formatLastActive(collaborator.lastActive)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManageThis && onUpdateAccess ? (
                <Select
                  value={collaborator.accessLevel}
                  onValueChange={(v) => onUpdateAccess(collaborator.id, v as typeof collaborator.accessLevel)}
                >
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <level.icon className="h-4 w-4" />
                          {level.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant="outline"
                  className={`${getAccessColor(collaborator.accessLevel)} gap-1`}
                >
                  {getAccessIcon(collaborator.accessLevel)}
                  {isOwner ? "Owner" : collaborator.accessLevel}
                </Badge>
              )}

              {canManageThis && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(collaborator.id)}
                  title="Remove access"
                >
                  <UserX className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
