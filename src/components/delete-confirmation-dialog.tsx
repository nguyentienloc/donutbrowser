"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LoadingButton } from "./loading-button";
import { RippleButton } from "./ui/ripple";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteFromServer?: boolean) => void | Promise<void>;
  title: string;
  description: string;
  confirmButtonText?: string;
  isLoading?: boolean;
  profileIds?: string[];
  profiles?: { id: string; name: string }[];
  isSynced?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonText,
  isLoading = false,
  profileIds,
  profiles = [],
  isSynced = false,
}: DeleteConfirmationDialogProps) {
  const { t } = useTranslation();
  const [deleteOption, setDeleteOption] = React.useState<"local" | "server">(
    "local",
  );

  // Reset option khi dialog mở
  React.useEffect(() => {
    if (isOpen) {
      setDeleteOption("local");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    await onConfirm(deleteOption === "server");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {profileIds && profileIds.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">
                {t("deleteDialog.profilesToDelete")}
              </p>
              <div className="bg-muted rounded-md p-3 max-h-32 overflow-y-auto">
                <ul className="space-y-1">
                  {profileIds.map((id) => {
                    const profile = profiles.find((p) => p.id === id);
                    const displayName = profile ? profile.name : id;
                    return (
                      <li key={id} className="text-sm text-muted-foreground">
                        • {displayName}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          {isSynced && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-3">Tùy chọn xóa:</p>
              <RadioGroup
                value={deleteOption}
                onValueChange={(v) => setDeleteOption(v as "local" | "server")}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="local" id="delete-local" />
                  <Label htmlFor="delete-local" className="cursor-pointer">
                    Chỉ xóa ở máy của bạn (giữ lại trên server)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="server" id="delete-server" />
                  <Label
                    htmlFor="delete-server"
                    className="cursor-pointer text-destructive"
                  >
                    Xóa cả ở máy của bạn và server
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </DialogHeader>
        <DialogFooter>
          <RippleButton
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {t("common.buttons.cancel")}
          </RippleButton>
          <LoadingButton
            variant="destructive"
            onClick={() => void handleConfirm()}
            isLoading={isLoading}
          >
            {confirmButtonText || t("common.buttons.delete")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
