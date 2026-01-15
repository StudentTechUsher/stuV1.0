'use client';

import { Avatar } from "@mui/material";

interface UserHeaderBarProps {
  name: string;
  avatarUrl: string | null;
  standing: string;
  creditsDisplay: string;
}

/**
 * Black header bar with user avatar, name, standing badge, and credits
 * Extracted from AcademicSummary for reuse in unified card
 * Spacing matches original MUI values (MUI spacing unit = 8px)
 */
export function UserHeaderBar({
  name,
  avatarUrl,
  standing,
  creditsDisplay,
}: UserHeaderBarProps) {
  return (
    <div className="bg-[#0A0A0A] border-b-2 border-[#0A0A0A] p-5">
      <div className="flex items-center gap-5">
        {/* Avatar with white border - 56x56px */}
        <Avatar
          src={avatarUrl || undefined}
          imgProps={{
            referrerPolicy: "no-referrer",
            onError: (e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }
          }}
          sx={{
            width: 56,
            height: 56,
            border: "3px solid white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            bgcolor: avatarUrl ? "transparent" : "var(--primary)"
          }}
        >
          {!avatarUrl && (
            <span className="font-header-bold text-xl text-black">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </Avatar>

        <div className="flex-1 space-y-1">
          {/* Name */}
          <h2 className="font-header-bold text-[1.375rem] font-extrabold text-white">
            {name}
          </h2>

          <div className="flex items-center gap-3">
            {/* Standing badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-md bg-[var(--primary)] shadow-[0_2px_8px_rgba(18,249,135,0.3)]">
              <span className="font-body-semi text-xs font-bold text-[#0A0A0A]">
                {standing}
              </span>
            </span>

            {/* Credits display */}
            <span className="font-body text-sm font-medium text-white/80">
              {creditsDisplay}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
