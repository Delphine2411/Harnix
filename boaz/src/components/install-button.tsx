// Composant bouton d'installation
// components/InstallButton.tsx
"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/src/hooks/install-prompt";

export default function InstallButton() {
  const { promptInstall, isInstalled, showIosInstallHint, canShowInstallButton } =
    useInstallPrompt();
  const [showHint, setShowHint] = useState(false);

  if (isInstalled || !canShowInstallButton) return null;

  return (
    <>
      <button
        onClick={async () => {
          if (showIosInstallHint) {
            setShowHint((prev) => !prev);
            return;
          }
          await promptInstall();
        }}
        className="fixed bottom-4 left-4 z-[60] bg-blue-600 text-white px-5 py-3 rounded-xl shadow-lg hover:bg-blue-700 flex items-center space-x-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Installer l&apos;application</span>
      </button>

      {showIosInstallHint && showHint && (
        <div className="fixed bottom-20 left-4 right-4 sm:right-auto sm:w-80 z-[60] bg-white border border-gray-200 rounded-xl p-4 shadow-xl text-sm text-gray-700">
          Sur iPhone/iPad: touchez <strong>Partager</strong> dans Safari, puis{" "}
          <strong>Sur l&apos;écran d&apos;accueil</strong>.
        </div>
      )}
    </>
  );
}
