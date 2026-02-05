"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BrowserFilter,
  type BrowserFilterType,
} from "@/components/browser-filter";
import { CamoufoxConfigDialog } from "@/components/camoufox-config-dialog";
import { CreateProfileDialog } from "@/components/create-profile-dialog";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { GroupAssignmentDialog } from "@/components/group-assignment-dialog";
import { GroupBadges } from "@/components/group-badges";
import { GroupManagementDialog } from "@/components/group-management-dialog";
import HomeHeader from "@/components/home-header";
import { OdooImportDialog } from "@/components/odoo-import-dialog";
import { ProfilesDataTableVirtual } from "@/components/profile-data-table-virtual";
import { ProxyManagementDialog } from "@/components/proxy-management-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { ZsMktImportDialog } from "@/components/zsmkt-import-dialog";
import { useBrowserDownload } from "@/hooks/use-browser-download";
import { useGroupEvents } from "@/hooks/use-group-events";
import type { PermissionType } from "@/hooks/use-permissions";
import { useProfileEvents } from "@/hooks/use-profile-events";
import { useProxyEvents } from "@/hooks/use-proxy-events";
import { useVersionUpdater } from "@/hooks/use-version-updater";
import { showErrorToast, showSuccessToast, showToast } from "@/lib/toast-utils";
import { useAuth } from "@/providers/auth-provider";
import type { BrowserProfile } from "@/types";

export default function Home() {
  useVersionUpdater();
  const {
    profiles,
    runningProfiles,
    isLoading: profilesLoading,
  } = useProfileEvents();
  const { groups: groupsData, isLoading: groupsLoading } = useGroupEvents();
  const { isLoading: proxiesLoading } = useProxyEvents();
  const { downloadBrowser } = useBrowserDownload();
  const { isLoggedIn } = useAuth();

  const [odooProfiles, setOdooProfiles] = useState<any[]>([]);
  const loadOdooProfiles = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const result = await invoke<{ items: any[] }>("list_odoo_profiles", {
        offset: 0,
        limit: 1000,
      });
      setOdooProfiles(result.items || []);
      console.log("✅ Reloaded Odoo profiles:", result.items?.length || 0);
    } catch (_e) {}
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) void loadOdooProfiles();
  }, [isLoggedIn, loadOdooProfiles]);

  // Listen DIRECTLY for profiles-changed event to reload Odoo profiles
  useEffect(() => {
    if (!isLoggedIn) return;
    let profilesChangedUnlisten: (() => void) | undefined;

    const setupListener = async () => {
      profilesChangedUnlisten = await listen("profiles-changed", () => {
        console.log(
          "🔄 [page.tsx] profiles-changed event received, reloading Odoo profiles...",
        );
        void loadOdooProfiles();
      });
      console.log("✅ [page.tsx] Listening for profiles-changed events");
    };

    void setupListener();

    return () => {
      if (profilesChangedUnlisten) {
        profilesChangedUnlisten();
        console.log(
          "❌ [page.tsx] Stopped listening for profiles-changed events",
        );
      }
    };
  }, [isLoggedIn, loadOdooProfiles]);

  // Listen for download progress events
  useEffect(() => {
    if (!isLoggedIn) return;
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<{
        profile_id: string;
        profile_name: string;
        downloaded: number;
        total: number;
        percentage: number;
      }>("download-progress", (event) => {
        const { profile_name, downloaded, total, percentage } = event.payload;

        // Chỉ xử lý event từ profile download, không xử lý event từ browser download
        if (
          !profile_name ||
          typeof downloaded !== "number" ||
          typeof total !== "number"
        ) {
          return; // Bỏ qua event từ browser download
        }

        const downloadedMB = (downloaded / 1024 / 1024).toFixed(2);
        const totalMB = (total / 1024 / 1024).toFixed(2);

        // Update toast using a predictable ID based on profile name
        toast.loading(
          `Đang tải "${profile_name}": ${downloadedMB}MB / ${totalMB}MB (${percentage}%)`,
          { id: `download-${profile_name}` },
        );
      });
    };

    void setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [isLoggedIn]);

  const handleDownloadWithProgress = useCallback(
    async (profileId: string, profileUrl: string, profileName: string) => {
      const toastId = `download-${profileName}`;
      toast.loading(`Đang tải "${profileName}": 0MB / 0MB (0%)`, {
        id: toastId,
      });

      try {
        await invoke("download_profile_from_odoo_s3", {
          profileId,
          profileUrl,
        });

        toast.dismiss(toastId);
        showSuccessToast(`Đã tải dữ liệu cho "${profileName}"!`);

        // Reload Odoo profiles to refresh the merged list
        void loadOdooProfiles();
      } catch (error: any) {
        toast.dismiss(toastId);
        showErrorToast(`Lỗi khi tải về: ${error}`);
      }
    },
    [loadOdooProfiles],
  );

  const mergedProfiles = useMemo(() => {
    console.log("🔄 Merging profiles...");
    console.log("  - Local profiles:", profiles.length);
    console.log("  - Odoo profiles:", odooProfiles.length);

    // Map local profiles by odoo_id for quick lookup
    const localByOdooId = new Map(
      profiles.filter((p) => p.odoo_id).map((p) => [String(p.odoo_id), p]),
    );

    console.log("  - Local with odoo_id:", localByOdooId.size);

    // Profiles from Odoo server
    const odooMerged = odooProfiles.map((op) => {
      const odooIdStr = String(op.id);
      const localProfile = localByOdooId.get(odooIdStr);

      // Parse created_at
      let created_at = 0;
      const rawDate = op.createdAt || op.create_date;
      if (rawDate && rawDate !== false) {
        try {
          const dateStr = String(rawDate);
          created_at = Math.floor(new Date(dateStr).getTime() / 1000);
        } catch (_e) {
          console.error("Failed to parse date:", rawDate);
        }
      }

      if (localProfile) {
        // Profile exists both on server and locally - merge data
        console.log(`  ✅ Merged: ${op.name} (local + odoo)`);
        return {
          ...localProfile,
          // Override with server data
          profile_url:
            op.profileUrl || op.profile_url || localProfile.profile_url,
          // FIX: Luôn ưu tiên ngày tạo từ Odoo server (created_at) hơn là ngày local
          created_at: created_at || localProfile.created_at,

          // FIX: Giữ lại thông tin proxy và user agent từ Odoo để hiển thị đúng
          user_agent: op.userAgent || (localProfile as any).user_agent,
          odoo_proxy: op.proxy_ids?.[0],

          // Keep local data for these fields
          name: localProfile.name,
          browser: localProfile.browser,
          version: localProfile.version,
        };
      } else {
        // Profile only on server (cloud-only)
        // Detect browser from User Agent if possible
        let browser = "camoufox"; // Default
        const ua = op.userAgent || "";
        if (ua.toLowerCase().includes("firefox")) {
          browser = "camoufox";
        } else if (
          ua.toLowerCase().includes("chrome") ||
          ua.toLowerCase().includes("chromium")
        ) {
          browser = "wayfern";
        }

        return {
          id: `cloud-${op.id}`,
          name: op.name,
          browser,
          version:
            browser === "wayfern" ? "v132.0.6834.83" : "v135.0.1-beta.24",
          status: "cloud",
          odoo_id: odooIdStr,
          profile_url: op.profileUrl || op.profile_url,
          user_agent: op.userAgent,
          odoo_proxy: op.proxy_ids?.[0],
          is_cloud_only: true,
          created_at,
        };
      }
    });

    // Local-only profiles (not synced to Odoo)
    const localOnly = profiles.filter((p) => !p.odoo_id);
    console.log("  - Local-only:", localOnly.length);
    console.log("  📊 Total merged:", odooMerged.length + localOnly.length);

    return [...odooMerged, ...localOnly];
  }, [profiles, odooProfiles]);

  const [selectedGroupId, setSelectedGroupId] = useState("default");
  const [browserFilter, setBrowserFilter] = useState<BrowserFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [createProfileDialogOpen, setCreateProfileDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [_integrationsDialogOpen, setIntegrationsDialogOpen] = useState(false);
  const [_importProfileDialogOpen, setImportProfileDialogOpen] =
    useState(false);
  const [zsmktImportDialogOpen, setZsmktImportDialogOpen] = useState(false);
  const [odooImportDialogOpen, setOdooImportDialogOpen] = useState(false);
  const [proxyManagementDialogOpen, setProxyManagementDialogOpen] =
    useState(false);
  const [camoufoxConfigDialogOpen, setCamoufoxConfigDialogOpen] =
    useState(false);
  const [groupManagementDialogOpen, setGroupManagementDialogOpen] =
    useState(false);
  const [groupAssignmentDialogOpen, setGroupAssignmentDialogOpen] =
    useState(false);
  const [_proxyAssignmentDialogOpen, _setProxyAssignmentDialogOpen] =
    useState(false);
  const [_cookieCopyDialogOpen, _setCookieCopyDialogOpen] = useState(false);
  const [_selectedProfilesForCookies, _setSelectedProfilesForCookies] =
    useState<string[]>([]);
  const [selectedProfilesForGroup, setSelectedProfilesForGroup] = useState<
    string[]
  >([]);
  const [_selectedProfilesForProxy, _setSelectedProfilesForProxy] = useState<
    string[]
  >([]);
  const [currentProfileForCamoufoxConfig, setCurrentProfileForCamoufoxConfig] =
    useState<BrowserProfile | null>(null);
  const [_launchOnLoginDialogOpen, _setLaunchOnLoginDialogOpen] =
    useState(false);
  const [_permissionDialogOpen, _setPermissionDialogOpen] = useState(false);
  const [_currentPermissionType, _setCurrentPermissionType] =
    useState<PermissionType>("microphone");
  const [showBulkDeleteConfirmation, setShowBulkDeleteConfirmation] =
    useState(false);
  const [isBulkDeleting, _setIsBulkDeleting] = useState(false);
  const [_syncConfigDialogOpen, setSyncConfigDialogOpen] = useState(false);
  const [_profileSyncDialogOpen, _setProfileSyncDialogOpen] = useState(false);
  const [_currentProfileForSync, _setCurrentProfileForSync] =
    useState<BrowserProfile | null>(null);

  const browserCounts = useMemo(() => {
    const counts: Record<BrowserFilterType, number> = {
      all: mergedProfiles.length,
      camoufox: 0,
      wayfern: 0,
      cloud: 0,
    };

    for (const p of mergedProfiles) {
      if ((p as any).is_cloud_only) {
        counts.cloud++;
      } else {
        if (p.browser === "camoufox" || p.browser === "firefox") {
          counts.camoufox++;
        } else if (p.browser === "wayfern" || p.browser === "chromium") {
          counts.wayfern++;
        }
      }
    }
    return counts;
  }, [mergedProfiles]);

  const filteredProfiles = useMemo(() => {
    let f = mergedProfiles;
    if (!selectedGroupId || selectedGroupId === "default")
      f = f.filter((p: any) => !p.group_id);
    else f = f.filter((p: any) => p.group_id === selectedGroupId);

    // Browser filter
    if (browserFilter === "cloud") {
      f = f.filter((p: any) => p.is_cloud_only);
    } else if (browserFilter !== "all") {
      f = f.filter((p: any) => {
        // Exclude cloud profiles from specific browser filters
        if (p.is_cloud_only) return false;

        if (browserFilter === "camoufox")
          return p.browser === "camoufox" || p.browser === "firefox";
        if (browserFilter === "wayfern")
          return p.browser === "wayfern" || p.browser === "chromium";
        return p.browser === browserFilter;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      f = f.filter(
        (p: any) =>
          p.name.toLowerCase().includes(q) || p.note?.toLowerCase().includes(q),
      );
    }
    return f;
  }, [mergedProfiles, selectedGroupId, searchQuery, browserFilter]);

  const sortedProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => {
      const idA = a.odoo_id ? parseInt(a.odoo_id, 10) : 0;
      const idB = b.odoo_id ? parseInt(b.odoo_id, 10) : 0;
      if (idA !== idB) return idB - idA;
      return ((b as any).created_at || 0) - ((a as any).created_at || 0);
    });
  }, [filteredProfiles]);

  const handleCreateProfile = async (d: any) => {
    await invoke("create_browser_profile_new", {
      ...d,
      groupId:
        d.groupId ||
        (selectedGroupId !== "default" ? selectedGroupId : undefined),
    });
  };

  const launchProfile = async (profile: BrowserProfile) => {
    try {
      await invoke("launch_browser_profile", { profile });
    } catch (err: any) {
      if (err.toString().includes("Browser app not found")) {
        showToast({
          type: "error",
          title: `Trình duyệt ${profile.browser} chưa được tải`,
          description: "Vui lòng tải về.",
          action: {
            label: "Tải ngay",
            onClick: () =>
              void downloadBrowser(profile.browser, profile.version),
          },
        });
      } else showErrorToast(`Lỗi: ${err}`);
    }
  };

  const handleImportCloudProfile = async (cp: any) => {
    const toastId = toast.loading("Đang nhập...");
    try {
      // FIX: Lấy đúng Odoo ID thực sự, bỏ tiền tố "cloud-" nếu có
      const odooId = String(cp.odoo_id || cp.id).replace("cloud-", "");
      console.log("Importing cloud profile:", cp.name, "odoo_id:", odooId);

      const existingProfile = profiles.find((p) => p.odoo_id === odooId);

      if (existingProfile) {
        console.log("Profile already exists locally:", existingProfile.name);
        if (cp.profileUrl || cp.profile_url) {
          toast.dismiss(toastId);
          await handleDownloadWithProgress(
            existingProfile.id,
            cp.profileUrl || cp.profile_url,
            cp.name,
          );
        } else {
          toast.dismiss(toastId);
          showErrorToast("Profile không có dữ liệu để tải về");
        }
        return;
      }

      console.log("Profile doesn't exist, importing...");
      // Profile doesn't exist, import it
      const createdAt = cp.createdAt || cp.create_date;
      const zs = {
        id: odooId, // Đảm bảo dùng ID sạch sẽ
        name: cp.name,
        fingerprint: {
          userAgent: cp.userAgent || cp.user_agent || "",
          timezone: cp.timezone || "Asia/Ho_Chi_Minh",
          language: cp.language || "vi-VN",
          platform: cp.platform || undefined,
        },
        status: "synced",
        version: "v135.0.1-beta.24",
        proxy:
          cp.proxy_ids && cp.proxy_ids.length > 0
            ? {
                protocol: cp.proxy_ids[0].giaothuc,
                host: cp.proxy_ids[0].ip,
                port: cp.proxy_ids[0].port,
                username: cp.proxy_ids[0].tendangnhap,
                password: cp.proxy_ids[0].matkhau,
              }
            : undefined,
        createdAt,
        localPath: cp.localPath || cp.local_path || "S3 Cloud", // Ghi rõ nguồn tải
        profileUrl: cp.profileUrl || cp.profile_url || undefined,
      };
      console.log("Calling import_zsmkt_profiles_batch with:", zs);
      await invoke("import_zsmkt_profiles_batch", { zsProfiles: [zs] });
      console.log("Import completed, reloading odoo profiles...");
      await loadOdooProfiles();
      showSuccessToast("Xong!");
    } catch (error: any) {
      console.error("Import error:", error);
      toast.dismiss(toastId);
      showErrorToast(`Lỗi: ${error}`);
    } finally {
      toast.dismiss(toastId);
    }
  };

  const [uploadingProfiles, setUploadingProfiles] = useState<Set<string>>(
    new Set(),
  );

  const handleUploadToOdoo = async (
    profile: BrowserProfile,
    allowCreate = true,
  ) => {
    // FIX: Khi dừng browser, event profile-running-changed có thể chưa cập nhật kịp
    // nên ta bỏ qua check runningProfiles.has ở đây nếu là gọi từ luồng đóng browser.

    // Kiểm tra nếu đang upload
    if (uploadingProfiles.has(profile.id)) {
      console.log(
        `Profile "${profile.name}" is already uploading, skipping automatic upload.`,
      );
      return;
    }

    const toastId = toast.loading(
      `Đang tự động đẩy "${profile.name}" lên Odoo...`,
    );
    setUploadingProfiles((prev) => new Set(prev).add(profile.id));

    try {
      const profileUrl = await invoke<string>("upload_profile_to_odoo_s3", {
        profileId: profile.id,
        baseUrl: localStorage.getItem("odoo_url") || "",
        sessionId: localStorage.getItem("session_id") || "",
      });

      // Cập nhật profile_url vào profile
      await invoke("update_profile_url", {
        profileId: profile.id,
        profileUrl: profileUrl,
      });

      console.log(
        "Checking odoo_id for sync:",
        profile.odoo_id,
        "type:",
        typeof profile.odoo_id,
      );

      // FIX: Cập nhật thông tin lên Odoo server sau khi upload thành công
      if (profile.odoo_id && profile.odoo_id !== "null") {
        // TRƯỜNG HỢP 1: Đã có ID trên Odoo -> Cập nhật URL mới
        try {
          const odooIdNum = Number.parseInt(profile.odoo_id, 10);
          console.log(`Calling update_odoo_profile for ID: ${odooIdNum}...`);

          // Tìm dữ liệu Odoo gốc để giữ lại các trường khác (userAgent, timezone, etc.)
          const originalOdoo = odooProfiles.find(
            (op) => Number(op.id) === odooIdNum,
          );

          await invoke("update_odoo_profile", {
            profile: {
              ...(originalOdoo || {}), // Lấy tất cả dữ liệu cũ làm base
              id: odooIdNum,
              name: profile.name,
              profileUrl: profileUrl,
            },
          });
          console.log("✅ Updated profile URL on Odoo server");
        } catch (odooErr) {
          console.error("❌ Failed to update Odoo server:", odooErr);
        }
      } else if (allowCreate) {
        // TRƯỜNG HỢP 2: Profile local chưa có trên Odoo VÀ được phép tạo mới -> Tạo record trên server
        try {
          console.log("Creating new profile record on Odoo server...");
          // Slugify tên profile để tạo localPath
          const slugify = (s: string) =>
            s
              .normalize("NFD")
              .replace(/\p{Diacritic}/gu, "")
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "_");

          const createResult = await invoke<any>("create_odoo_profile", {
            profile: {
              id: 0,
              name: profile.name,
              profileUrl: profileUrl,
              userAgent: (profile as any).user_agent || "",
              localPath: `profiles/${slugify(profile.name)}`,
            },
          });

          const newOdooId = String(createResult.id || createResult);
          if (newOdooId && newOdooId !== "null" && newOdooId !== "0") {
            console.log("✅ New Odoo ID created:", newOdooId);
            await invoke("update_profile_odoo_id", {
              profileId: profile.id,
              odooId: newOdooId,
            });
          }
        } catch (createErr) {
          console.error("Failed to create profile on Odoo server:", createErr);
        }
      } else {
        // Không có odoo_id và không được tạo mới (ví dụ: khi dừng browser)
        console.log(
          "⏭️ Profile local (không có odoo_id) - bỏ qua tạo mới (allowCreate=false)",
        );
      }

      // Reload để cập nhật UI trạng thái "Synced"
      void loadOdooProfiles();

      toast.dismiss(toastId);
      showSuccessToast(`Đã đẩy "${profile.name}" lên Odoo thành công!`);
    } catch (err: any) {
      toast.dismiss(toastId);
      showErrorToast(`Lỗi khi đẩy lên: ${err}`);
    } finally {
      setUploadingProfiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const isLoading = profilesLoading || groupsLoading || proxiesLoading;

  return (
    <div className="grid items-center justify-items-center min-h-screen bg-background">
      <main className="flex flex-col items-center w-full max-w-[1300px] h-screen px-4 py-4">
        <HomeHeader
          onCreateProfileDialogOpen={setCreateProfileDialogOpen}
          onGroupManagementDialogOpen={setGroupManagementDialogOpen}
          onImportProfileDialogOpen={setImportProfileDialogOpen}
          onZsmktImportDialogOpen={setZsmktImportDialogOpen}
          onOdooImportDialogOpen={setOdooImportDialogOpen}
          onProxyManagementDialogOpen={setProxyManagementDialogOpen}
          onSettingsDialogOpen={setSettingsDialogOpen}
          onSyncConfigDialogOpen={setSyncConfigDialogOpen}
          onIntegrationsDialogOpen={setIntegrationsDialogOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
        <div className="w-full mt-2.5 flex-1 flex flex-col min-h-0">
          <GroupBadges
            selectedGroupId={selectedGroupId}
            onGroupSelect={setSelectedGroupId}
            groups={groupsData}
            isLoading={isLoading}
          />
          <BrowserFilter
            selectedFilter={browserFilter}
            onFilterSelect={setBrowserFilter}
            counts={browserCounts}
          />
          <div className="flex-1 min-h-0 mt-2">
            <ProfilesDataTableVirtual
              profiles={sortedProfiles as any}
              onLaunchProfile={launchProfile}
              onKillProfile={async (p) => {
                try {
                  await invoke("kill_browser_profile", { profile: p });
                  // Đợi 1 giây để browser giải phóng file hoàn toàn
                  // allowCreate=false: khi dừng browser không tạo mới profile trên Odoo
                  setTimeout(() => {
                    void handleUploadToOdoo(p as any, false);
                  }, 1500);
                } catch (err) {
                  showErrorToast(`Lỗi khi dừng: ${err}`);
                }
              }}
              onCloneProfile={async (p) => {
                const toastId = toast.loading(`Đang nhân bản "${p.name}"...`);
                try {
                  await invoke("clone_profile", { profileId: p.id });
                  toast.dismiss(toastId);
                  showSuccessToast(`Đã nhân bản "${p.name}" thành công!`);
                } catch (err) {
                  toast.dismiss(toastId);
                  showErrorToast(`Lỗi nhân bản: ${err}`);
                }
              }}
              onDeleteProfile={async (p, deleteFromServer) => {
                // Nếu user chọn xóa cả server và profile có odoo_id
                if (deleteFromServer && p.odoo_id && p.odoo_id !== "null") {
                  try {
                    const odooIdNum = Number.parseInt(p.odoo_id, 10);
                    console.log(
                      `Deleting profile from Odoo server, ID: ${odooIdNum}...`,
                    );
                    await invoke("delete_odoo_profile", { id: odooIdNum });
                    console.log("✅ Deleted from Odoo server");
                  } catch (err) {
                    console.error("❌ Failed to delete from Odoo server:", err);
                    showErrorToast(`Lỗi xóa trên server: ${err}`);
                  }
                }
                // Xóa local
                await invoke("delete_profile", { profileId: p.id });
              }}
              onRenameProfile={(id, newName) =>
                invoke("rename_profile", { profileId: id, newName })
              }
              onConfigureCamoufox={(p) => {
                setCurrentProfileForCamoufoxConfig(p);
                setCamoufoxConfigDialogOpen(true);
              }}
              runningProfiles={runningProfiles}
              isUpdating={(_) => false}
              onDeleteSelectedProfiles={(ids) =>
                invoke("delete_selected_profiles", { profileIds: ids })
              }
              onAssignProfilesToGroup={(ids) => {
                setSelectedProfilesForGroup(ids);
                setGroupAssignmentDialogOpen(true);
              }}
              selectedGroupId={selectedGroupId}
              selectedProfiles={selectedProfiles}
              onSelectedProfilesChange={setSelectedProfiles}
              onUploadToOdoo={handleUploadToOdoo}
              uploadingProfiles={uploadingProfiles}
              onDownloadFromOdoo={async (p) => {
                if (p.profile_url) {
                  await handleDownloadWithProgress(p.id, p.profile_url, p.name);
                }
              }}
              onImportCloudProfile={handleImportCloudProfile}
            />
          </div>
        </div>
      </main>
      <CreateProfileDialog
        isOpen={createProfileDialogOpen}
        onClose={() => setCreateProfileDialogOpen(false)}
        onCreateProfile={handleCreateProfile}
        selectedGroupId={selectedGroupId}
      />
      <SettingsDialog
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        onIntegrationsOpen={() => setIntegrationsDialogOpen(true)}
      />
      <OdooImportDialog
        isOpen={odooImportDialogOpen}
        onClose={() => setOdooImportDialogOpen(false)}
      />
      <ZsMktImportDialog
        isOpen={zsmktImportDialogOpen}
        onClose={() => setZsmktImportDialogOpen(false)}
      />
      <GroupAssignmentDialog
        isOpen={groupAssignmentDialogOpen}
        onClose={() => setGroupAssignmentDialogOpen(false)}
        selectedProfiles={selectedProfilesForGroup}
        onAssignmentComplete={() => setGroupAssignmentDialogOpen(false)}
        profiles={profiles}
      />
      <DeleteConfirmationDialog
        isOpen={showBulkDeleteConfirmation}
        onClose={() => setShowBulkDeleteConfirmation(false)}
        onConfirm={() =>
          invoke("delete_selected_profiles", { profileIds: selectedProfiles })
        }
        title="Xóa Profile"
        description="Xóa các profile đã chọn?"
        confirmButtonText="Xóa"
        isLoading={isBulkDeleting}
      />
      <CamoufoxConfigDialog
        isOpen={camoufoxConfigDialogOpen}
        onClose={() => setCamoufoxConfigDialogOpen(false)}
        profile={currentProfileForCamoufoxConfig}
        onSave={(p, c) =>
          invoke("update_camoufox_config", { profileId: p.id, config: c })
        }
        isRunning={false}
      />
      <GroupManagementDialog
        isOpen={groupManagementDialogOpen}
        onClose={() => setGroupManagementDialogOpen(false)}
        onGroupManagementComplete={() => {}}
      />
      <ProxyManagementDialog
        isOpen={proxyManagementDialogOpen}
        onClose={() => setProxyManagementDialogOpen(false)}
      />
    </div>
  );
}
