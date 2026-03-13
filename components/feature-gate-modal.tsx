"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeatureGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
  onStartTrial: () => void;
}

export function FeatureGateModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  onStartTrial,
}: FeatureGateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{featureName}</DialogTitle>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3" />
              Pro
            </span>
          </div>
          <DialogDescription>{featureDescription}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col items-center gap-3 sm:flex-col sm:items-center">
          <Button className="w-full" onClick={onStartTrial}>
            <Sparkles className="size-4" />
            Start 14-day free trial
          </Button>
          <p className="text-xs text-muted-foreground">
            No credit card required
          </p>
          <a
            href="/pricing"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Learn more
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
