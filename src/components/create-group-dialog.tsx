"use client";

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileGroup } from "@/types";
import { RippleButton } from "./ui/ripple";

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: ProfileGroup) => void;
}

export function CreateGroupDialog({
  isOpen,
  onClose,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const newGroup = await invoke<ProfileGroup>("create_profile_group", {
        name: groupName.trim(),
      });

      toast.success("Group created successfully");
      onGroupCreated(newGroup);
      setGroupName("");
      onClose();
    } catch (err) {
      console.error("Failed to create group:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create group";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, [groupName, onGroupCreated, onClose]);

  const handleClose = useCallback(() => {
    setGroupName("");
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo nhóm mới</DialogTitle>
          <DialogDescription>
            Tạo nhóm mới để sắp xếp các browser profile của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Tên nhóm</Label>
            <Input
              id="group-name"
              placeholder="Nhập tên nhóm..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && groupName.trim()) {
                  void handleCreate();
                }
              }}
              disabled={isCreating}
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <RippleButton
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Hủy
          </RippleButton>
          <LoadingButton
            isLoading={isCreating}
            onClick={() => void handleCreate()}
            disabled={!groupName.trim()}
          >
            Tạo
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
