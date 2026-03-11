"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Link2, Copy, Check, UserPlus, Shield, Eye, MessageSquare, Edit3 } from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  type: "human" | "agent";
  accessLevel: "view" | "comment" | "edit" | "admin";
}

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  ownerId: string;
  currentUserId: string;
  currentUserAccess: "view" | "comment" | "edit" | "admin";
  collaborators: Collaborator[];
  onShare: (userId: string, accessLevel: "view" | "comment" | "edit" | "admin") => Promise<void>;
  onUpdateAccess: (userId: string, accessLevel: "view" | "comment" | "edit" | "admin") => Promise<void>;
  onRemoveAccess: (userId: string) => Promise<void>;
  onCreateShareLink?: (accessLevel: "view" | "comment" | "edit") => Promise<string>;
}

const accessLevels = [
  { value: "view", label: "Can view", icon: Eye, description: "Read-only access" },
  { value: "comment", label: "Can comment", icon: MessageSquare, description: "View and add comments" },
  { value: "edit", label: "Can edit", icon: Edit3, description: "Full editing access" },
  { value: "admin", label: "Admin", icon: Shield, description: "Manage permissions and delete" },
] as const;

export function ShareDialog({
  documentId,
  documentTitle,
  ownerId,
  currentUserId,
  currentUserAccess,
  collaborators,
  onShare,
  onUpdateAccess,
  onRemoveAccess,
  onCreateShareLink,
}: ShareDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccess, setSelectedAccess] = useState<"view" | "comment" | "edit" | "admin">("view");
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showLinkOptions, setShowLinkOptions] = useState(false);
  const [linkAccessLevel, setLinkAccessLevel] = useState<"view" | "comment" | "edit">("view");

  const isAdmin = currentUserAccess === "admin" || currentUserId === ownerId;
  const isEditor = isAdmin || currentUserAccess === "edit";

  const canManagePermissions = (targetCollaborator: Collaborator) => {
    if (currentUserId === ownerId) return true;
    if (currentUserId === targetCollaborator.id) return false; // Can't manage self
    if (targetCollaborator.accessLevel === "admin") return false; // Can't manage other admins
    return isAdmin;
  };

  const handleShare = async () => {
    if (!searchQuery.trim()) return;
    setIsSharing(true);
    try {
      // In real implementation, search for user first, then share
      await onShare(searchQuery, selectedAccess);
      setSearchQuery("");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCreateLink = async () => {
    if (!onCreateShareLink) return;
    const link = await onCreateShareLink(linkAccessLevel);
    setShareLink(link);
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getAccessIcon = (level: string) => {
    const access = accessLevels.find((a) => a.value === level);
    const Icon = access?.icon || Eye;
    return <Icon className="h-4 w-4" />;
  };

  const getAccessBadgeColor = (level: string) => {
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Share "{documentTitle}"</DialogTitle>
          <DialogDescription>
            Invite people or agents to collaborate on this document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share Input */}
          {isEditor && (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or @agent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={selectedAccess}
                onValueChange={(v) => setSelectedAccess(v as typeof selectedAccess)}
              >
                <SelectTrigger className="w-[140px]">
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
              <Button onClick={handleShare} disabled={!searchQuery.trim() || isSharing}>
                {isSharing ? "Sharing..." : "Share"}
              </Button>
            </div>
          )}

          {/* Share Link Section */}
          {isAdmin && onCreateShareLink && (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Shareable link</span>
                </div>
                {!shareLink ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLinkOptions(!showLinkOptions)}
                  >
                    {showLinkOptions ? "Cancel" : "Create link"}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={copyLink}>
                    {copiedLink ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {showLinkOptions && !shareLink && (
                <div className="flex gap-2">
                  <Select
                    value={linkAccessLevel}
                    onValueChange={(v) => setLinkAccessLevel(v as typeof linkAccessLevel)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accessLevels.slice(0, 3).map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <level.icon className="h-4 w-4" />
                            {level.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateLink}>Create</Button>
                </div>
              )}

              {shareLink && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                  <code className="flex-1 truncate">{shareLink}</code>
                  <Button variant="ghost" size="sm" onClick={copyLink}>
                    {copiedLink ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Collaborators List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              People with access ({collaborators.length + 1})
            </h4>
            <div className="space-y-1 max-h-[240px] overflow-y-auto">
              {/* Owner */}
              {collaborators.find((c) => c.id === ownerId) && (
                <div className="flex items-center justify-between p-2 rounded hover:bg-muted">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={collaborators.find((c) => c.id === ownerId)?.avatar} />
                      <AvatarFallback>
                        {collaborators.find((c) => c.id === ownerId)?.name?.[0] || "O"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {collaborators.find((c) => c.id === ownerId)?.name}
                        <span className="text-xs text-muted-foreground ml-2">(You)</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Owner</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                    <Shield className="h-3 w-3 mr-1" />
                    Owner
                  </Badge>
                </div>
              )}

              {/* Other collaborators */}
              {collaborators
                .filter((c) => c.id !== ownerId)
                .map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback>
                          {collaborator.type === "agent" ? "🤖" : collaborator.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {collaborator.name}
                          {collaborator.type === "agent" && (
                            <Badge variant="secondary" className="text-xs">Agent</Badge>
                          )}
                        </p>
                        {collaborator.email && (
                          <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManagePermissions(collaborator) ? (
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
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={getAccessBadgeColor(collaborator.accessLevel)}>
                          {getAccessIcon(collaborator.accessLevel)}
                          <span className="ml-1 capitalize">{collaborator.accessLevel}</span>
                        </Badge>
                      )}

                      {canManagePermissions(collaborator) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => onRemoveAccess(collaborator.id)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
