"use client";

import { Badge } from "@/components/ui/badge";
import { Shield, Eye, MessageSquare, Edit3, Crown, Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type AccessLevel = "view" | "comment" | "edit" | "admin" | "owner";
type AccessType = "private" | "workspace" | "public" | "link";

interface AccessBadgeProps {
  level: AccessLevel;
  type?: AccessType;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const accessConfig = {
  owner: {
    label: "Owner",
    icon: Crown,
    colors: "bg-yellow-100 text-yellow-800 border-yellow-300",
    iconColor: "text-yellow-600",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    colors: "bg-purple-100 text-purple-800 border-purple-300",
    iconColor: "text-purple-600",
  },
  edit: {
    label: "Can edit",
    icon: Edit3,
    colors: "bg-green-100 text-green-800 border-green-300",
    iconColor: "text-green-600",
  },
  comment: {
    label: "Can comment",
    icon: MessageSquare,
    colors: "bg-amber-100 text-amber-800 border-amber-300",
    iconColor: "text-amber-600",
  },
  view: {
    label: "Can view",
    icon: Eye,
    colors: "bg-blue-100 text-blue-800 border-blue-300",
    iconColor: "text-blue-600",
  },
};

const typeConfig = {
  private: {
    label: "Private",
    icon: Lock,
    colors: "bg-gray-100 text-gray-800 border-gray-300",
  },
  workspace: {
    label: "Workspace",
    icon: Globe,
    colors: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  public: {
    label: "Public",
    icon: Globe,
    colors: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  link: {
    label: "Anyone with link",
    icon: Globe,
    colors: "bg-cyan-100 text-cyan-800 border-cyan-300",
  },
};

export function AccessBadge({
  level,
  type,
  showIcon = true,
  showLabel = true,
  size = "md",
  className,
}: AccessBadgeProps) {
  const config = accessConfig[level];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-sm px-2.5 py-0.5 gap-1.5",
    lg: "text-base px-3 py-1 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.colors,
        sizeClasses[size],
        "font-medium inline-flex items-center",
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], config.iconColor)} />}
      {showLabel && config.label}
    </Badge>
  );
}

interface AccessTypeBadgeProps {
  type: AccessType;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AccessTypeBadge({
  type,
  showIcon = true,
  showLabel = true,
  size = "md",
  className,
}: AccessTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-sm px-2.5 py-0.5 gap-1.5",
    lg: "text-base px-3 py-1 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.colors,
        sizeClasses[size],
        "font-medium inline-flex items-center",
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && config.label}
    </Badge>
  );
}

interface CombinedAccessBadgeProps {
  level: AccessLevel;
  type: AccessType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CombinedAccessBadge({
  level,
  type,
  size = "md",
  className,
}: CombinedAccessBadgeProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <AccessTypeBadge type={type} size={size} />
      <span className="text-muted-foreground">·</span>
      <AccessBadge level={level} size={size} />
    </div>
  );
}

// Document header access indicator
interface DocumentAccessIndicatorProps {
  accessLevel: AccessLevel;
  accessType: AccessType;
  isOwner: boolean;
  collaboratorCount: number;
  onClick?: () => void;
}

export function DocumentAccessIndicator({
  accessLevel,
  accessType,
  isOwner,
  collaboratorCount,
  onClick,
}: DocumentAccessIndicatorProps) {
  const Icon = isOwner ? Crown : accessConfig[accessLevel].icon;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border hover:bg-muted transition-colors text-sm"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">
        {isOwner ? "Owned by you" : `${accessConfig[accessLevel].label}`}
      </span>
      {collaboratorCount > 0 && (
        <>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {collaboratorCount} collaborator{collaboratorCount > 1 ? "s" : ""}
          </span>
        </>
      )}
    </button>
  );
}
