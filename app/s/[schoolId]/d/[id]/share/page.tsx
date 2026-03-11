"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ShareDialog } from "@/components/documents/share-dialog";
import { CollaboratorList } from "@/components/documents/collaborator-list";
import { AccessTypeBadge } from "@/components/documents/access-badge";
import { 
  Globe, 
  Lock, 
  Users, 
  Link2, 
  Shield, 
  Eye, 
  MessageSquare, 
  Edit3,
  Copy,
  Check,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

type CollaboratorAccessLevel = "view" | "comment" | "edit" | "admin";

type Collaborator = {
  id: string;
  name: string;
  type: "human" | "agent";
  accessLevel: CollaboratorAccessLevel;
  lastActive: string;
  email?: string;
};

// Mock data - replace with actual data fetching
const mockCollaborators: Collaborator[] = [
  {
    id: "user-1",
    name: "You",
    email: "you@example.com",
    type: "human",
    accessLevel: "admin",
    lastActive: new Date().toISOString(),
  },
  {
    id: "agent-1",
    name: "@claw",
    type: "agent",
    accessLevel: "edit",
    lastActive: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

export default function ShareSettingsPage() {
  const params = useParams();
  const { schoolId, id: docId } = params;
  
  const [accessType, setAccessType] = useState<"private" | "workspace" | "link">("private");
  const [defaultAccess, setDefaultAccess] = useState<"view" | "comment" | "edit">("view");
  const [allowAgentAccess, setAllowAgentAccess] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [collaborators, setCollaborators] = useState(mockCollaborators);

  const documentTitle = "Project Requirements"; // Fetch from API
  const ownerId = "user-1";
  const currentUserId = "user-1";
  const currentUserAccess = "admin" as const;

  const handleCreateShareLink = async (accessLevel: "view" | "comment" | "edit") => {
    // In real implementation, call API to create share link
    const token = Math.random().toString(36).substring(2, 15);
    const link = `https://app.knobase.com/s/${schoolId}/d/${docId}?token=${token}`;
    setShareLink(link);
    return link;
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateAccess = async (userId: string, accessLevel: "view" | "comment" | "edit" | "admin") => {
    // In real implementation, call API to update access
    setCollaborators(prev => 
      prev.map(c => c.id === userId ? { ...c, accessLevel } : c)
    );
  };

  const handleRemoveAccess = async (userId: string) => {
    // In real implementation, call API to remove access
    setCollaborators(prev => prev.filter(c => c.id !== userId));
  };

  const handleShare = async (userId: string, accessLevel: "view" | "comment" | "edit" | "admin") => {
    // In real implementation, call API to share
    console.log("Sharing with", userId, accessLevel);
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/s/${schoolId}/d/${docId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to document
        </Link>
        <h1 className="text-3xl font-bold">Share "{documentTitle}"</h1>
        <p className="text-muted-foreground mt-1">
          Manage who can access this document and what they can do
        </p>
      </div>

      <div className="space-y-6">
        {/* General Access Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Access
            </CardTitle>
            <CardDescription>
              Control the default access level for this document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Access Type */}
            <div className="space-y-3">
              <Label>Who can access</Label>
              <Select 
                value={accessType} 
                onValueChange={(v) => setAccessType(v as typeof accessType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Private</div>
                        <div className="text-xs text-muted-foreground">Only invited people</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="workspace">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Workspace</div>
                        <div className="text-xs text-muted-foreground">Anyone in the workspace</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="link">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Anyone with the link</div>
                        <div className="text-xs text-muted-foreground">No sign-in required</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Default Access Level */}
            {(accessType === "workspace" || accessType === "link") && (
              <div className="space-y-3">
                <Label>Default access level</Label>
                <Select 
                  value={defaultAccess} 
                  onValueChange={(v) => setDefaultAccess(v as typeof defaultAccess)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Can view
                      </div>
                    </SelectItem>
                    <SelectItem value="comment">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Can comment
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4" />
                        Can edit
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Share Link */}
            {accessType === "link" && (
              <div className="space-y-3">
                <Label>Share link</Label>
                <div className="flex gap-2">
                  {shareLink ? (
                    <>
                      <Input value={shareLink} readOnly className="flex-1" />
                      <Button variant="outline" onClick={copyLink}>
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => handleCreateShareLink(defaultAccess)}
                      className="w-full"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Generate share link
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Agent Access Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  Allow agent access
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI agents can be invited to collaborate
                </p>
              </div>
              <Switch 
                checked={allowAgentAccess} 
                onCheckedChange={setAllowAgentAccess}
              />
            </div>

            {/* Approval Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-500" />
                  Require approval for edits
                </Label>
                <p className="text-sm text-muted-foreground">
                  Agent edits must be approved before applying
                </p>
              </div>
              <Switch 
                checked={requireApproval} 
                onCheckedChange={setRequireApproval}
              />
            </div>
          </CardContent>
        </Card>

        {/* Collaborators Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Collaborators
              </CardTitle>
              <CardDescription>
                People and agents with access to this document
              </CardDescription>
            </div>
            <ShareDialog
              documentId={docId as string}
              documentTitle={documentTitle}
              ownerId={ownerId}
              currentUserId={currentUserId}
              currentUserAccess={currentUserAccess}
              collaborators={collaborators}
              onShare={handleShare}
              onUpdateAccess={handleUpdateAccess}
              onRemoveAccess={handleRemoveAccess}
              onCreateShareLink={handleCreateShareLink}
            />
          </CardHeader>
          <CardContent>
            <CollaboratorList
              collaborators={collaborators}
              ownerId={ownerId}
              currentUserId={currentUserId}
              currentUserAccess={currentUserAccess}
              onUpdateAccess={handleUpdateAccess}
              onRemove={handleRemoveAccess}
            />
          </CardContent>
        </Card>

        {/* Access Log Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Log
            </CardTitle>
            <CardDescription>
              Recent activity related to this document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <span className="font-medium">Document created</span>
                  <p className="text-muted-foreground">By you</p>
                </div>
                <span className="text-muted-foreground">2 days ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <span className="font-medium">@claw invited</span>
                  <p className="text-muted-foreground">Can edit</p>
                </div>
                <span className="text-muted-foreground">1 day ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium">Access changed to Private</span>
                  <p className="text-muted-foreground">By you</p>
                </div>
                <span className="text-muted-foreground">5 hours ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
