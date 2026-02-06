import { useTranslation } from "react-i18next";
import { GoGear, GoKebabHorizontal, GoPlus } from "react-icons/go";
import {
  LuCloud,
  LuLogOut,
  LuSearch,
  LuUser,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { useAuth } from "@/providers/auth-provider";
import { Logo } from "./icons/logo";
import { Button } from "./ui/button";
import { CardTitle } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Props = {
  onSettingsDialogOpen: (open: boolean) => void;
  onProxyManagementDialogOpen: (open: boolean) => void;
  onGroupManagementDialogOpen: (open: boolean) => void;
  onImportProfileDialogOpen: (open: boolean) => void;
  onZsmktImportDialogOpen: (open: boolean) => void;
  onOdooImportDialogOpen: (open: boolean) => void;
  onCreateProfileDialogOpen: (open: boolean) => void;
  onSyncConfigDialogOpen: (open: boolean) => void;
  onIntegrationsDialogOpen: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
};

const HomeHeader = ({
  onSettingsDialogOpen,
  onProxyManagementDialogOpen,
  onGroupManagementDialogOpen,
  onImportProfileDialogOpen,
  onZsmktImportDialogOpen,
  onOdooImportDialogOpen,
  onCreateProfileDialogOpen,
  onSyncConfigDialogOpen,
  onIntegrationsDialogOpen,
  searchQuery,
  onSearchQueryChange,
}: Props) => {
  const { t } = useTranslation();
  const { isLoggedIn, logout, username } = useAuth();
  const handleLogoClick = () => {
    // Trigger the same URL handling logic as if the URL came from the system
    const event = new CustomEvent("url-open-request", {
      detail: "https://donutbrowser.com",
    });
    window.dispatchEvent(event);
  };
  return (
    <div className="flex justify-between items-center mt-2 w-full px-0">
      <div className="flex gap-3 items-center">
        <button
          type="button"
          className="p-1 cursor-pointer"
          title="Open donutbrowser.com"
          onClick={handleLogoClick}
        >
          <Logo className="w-10 h-10 transition-transform duration-300 ease-out will-change-transform hover:scale-110" />
        </button>
        <CardTitle>Donut</CardTitle>
      </div>
      <div className="flex gap-2 items-center">
        <div className="relative">
          <Input
            type="text"
            placeholder={t("header.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pr-8 pl-10 w-96"
          />
          <LuSearch className="absolute left-3 top-1/2 w-4 h-4 transform -translate-y-1/2 text-muted-foreground" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2 top-1/2 p-1 rounded-sm transition-colors transform -translate-y-1/2 hover:bg-accent"
              aria-label={t("header.clearSearch")}
            >
              <LuX className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        {isLoggedIn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-[36px] px-2 gap-2"
                      >
                        <LuUser className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium max-w-[120px] truncate">
                          {username || "User"}
                        </span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("header.menu.odooAccount")}
                  </TooltipContent>
                </Tooltip>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => void logout()}
                className="text-destructive"
              >
                <LuLogOut className="mr-2 w-4 h-4" />
                {t("header.menu.logoutOdoo")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex gap-2 items-center h-[36px]"
                    >
                      <GoKebabHorizontal className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t("header.moreActions")}</TooltipContent>
              </Tooltip>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                onSettingsDialogOpen(true);
              }}
            >
              <GoGear className="mr-2 w-4 h-4" />
              {t("header.menu.settings")}
            </DropdownMenuItem>
            {/* Tạm ẩn Proxy
            <DropdownMenuItem
              onClick={() => {
                onProxyManagementDialogOpen(true);
              }}
            >
              <FiWifi className="mr-2 w-4 h-4" />
              {t("header.menu.proxies")}
            </DropdownMenuItem>
            */}
            <DropdownMenuItem
              onClick={() => {
                onGroupManagementDialogOpen(true);
              }}
            >
              <LuUsers className="mr-2 w-4 h-4" />
              {t("header.menu.groups")}
            </DropdownMenuItem>
            {/* Tạm ẩn Dịch vụ đồng bộ
            <DropdownMenuItem
              onClick={() => {
                onSyncConfigDialogOpen(true);
              }}
            >
              <LuCloud className="mr-2 w-4 h-4" />
              {t("header.menu.syncService")}
            </DropdownMenuItem>
            */}
            {/* Tạm ẩn Tích hợp
            <DropdownMenuItem
              onClick={() => {
                onIntegrationsDialogOpen(true);
              }}
            >
              <LuPlug className="mr-2 w-4 h-4" />
              {t("header.menu.integrations")}
            </DropdownMenuItem>
            */}
            {/* Tạm ẩn Nhập từ zs-mkt
            <DropdownMenuItem
              onClick={() => {
                onZsmktImportDialogOpen(true);
              }}
            >
              <FaDownload className="mr-2 w-4 h-4 text-orange-500" />
              {t("header.menu.importZsmkt")}
            </DropdownMenuItem>
            */}
            {isLoggedIn && (
              <DropdownMenuItem
                onClick={() => {
                  onOdooImportDialogOpen(true);
                }}
              >
                <LuCloud className="mr-2 w-4 h-4 text-primary" />
                {t("header.menu.importOdoo")}
              </DropdownMenuItem>
            )}
            {/* Tạm ẩn Nhập Profile
            <DropdownMenuItem
              onClick={() => {
                onImportProfileDialogOpen(true);
              }}
            >
              <FaDownload className="mr-2 w-4 h-4" />
              {t("header.menu.importProfile")}
            </DropdownMenuItem>
            */}
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                onClick={() => {
                  onCreateProfileDialogOpen(true);
                }}
                className="flex gap-2 items-center h-[36px]"
              >
                <GoPlus className="w-4 h-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent
            arrowOffset={-8}
            style={{ transform: "translateX(-8px)" }}
          >
            {t("header.createProfile")}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default HomeHeader;
