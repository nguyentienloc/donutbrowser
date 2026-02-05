"use client";

import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LoadingButton } from "@/components/loading-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RippleButton } from "./ui/ripple";

interface ZsMktImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ZsMktImportDialog({ isOpen, onClose }: ZsMktImportDialogProps) {
  const { t } = useTranslation();
  const [jsonInput, setJsonInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error(t("zsmktImport.emptyError") || "Vui lòng dán dữ liệu JSON");
      return;
    }

    setIsImporting(true);
    try {
      let profiles = [];
      try {
        const parsed = JSON.parse(jsonInput);
        // Handle both direct array and the zustand persist format
        profiles = Array.isArray(parsed)
          ? parsed
          : parsed.state?.profiles || [];
      } catch (_e) {
        toast.error(t("errors.invalidJson") || "Định dạng JSON không hợp lệ");
        setIsImporting(false);
        return;
      }

      if (profiles.length === 0) {
        toast.error(
          t("zsmktImport.noProfilesFound") || "Không tìm thấy profile nào",
        );
        setIsImporting(false);
        return;
      }

      const count = await invoke<number>("import_zsmkt_profiles_batch", {
        zsProfiles: profiles,
      });

      toast.success(
        t("profiles.toasts.success.importSuccess", { count }) ||
          `Đã nhập ${count} profile thành công`,
      );
      setJsonInput("");
      onClose();
    } catch (error) {
      console.error("Failed to import profiles:", error);
      toast.error(
        t("profiles.toasts.error.importFailed") || "Nhập profile thất bại",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("zsmktImport.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="json-input">{t("zsmktImport.label")}</Label>
            <Textarea
              id="json-input"
              placeholder='[{"id": "...", "name": "...", "fingerprint": {...}, ...}]'
              className="min-h-[300px] font-mono text-xs"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("zsmktImport.description")}
          </p>
        </div>

        <DialogFooter>
          <RippleButton variant="outline" onClick={onClose}>
            {t("common.buttons.cancel")}
          </RippleButton>
          <LoadingButton
            isLoading={isImporting}
            onClick={handleImport}
            disabled={!jsonInput.trim()}
          >
            {t("zsmktImport.importButton")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
