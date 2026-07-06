"use client";

import { useMemo, useState } from "react";

import { generateLookbookPrompt } from "@/lib/outfits";
import type { InventoryItem } from "@/types/inventory";
import type { ValidatedOutfit } from "@/types/outfit";

type LookbookPromptPanelProps = {
  validatedOutfit: ValidatedOutfit;
  inventoryItems: InventoryItem[];
  title?: string;
};

export function LookbookPromptPanel({
  validatedOutfit,
  inventoryItems,
  title = "Lookbook prompt",
}: LookbookPromptPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const promptResult = useMemo(
    () => generateLookbookPrompt(validatedOutfit, inventoryItems),
    [inventoryItems, validatedOutfit],
  );

  async function handleCopy() {
    if (!promptResult.canGenerate || !isVisible) {
      return;
    }

    await navigator.clipboard.writeText(promptResult.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="detail-card prompt-card">
      <div className="prompt-card-header">
        <div className="prompt-copy">
          <p className="sku-label">Prompt</p>
          <h2 className="prompt-title">{title}</h2>
          <p className="prompt-helper">Generate a polished ChatGPT-ready prompt from the linked wardrobe items.</p>
        </div>
        <div className="prompt-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={!promptResult.canGenerate || !isVisible}
            onClick={handleCopy}
          >
            {copied ? "Copied" : "Copy Prompt"}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!promptResult.canGenerate}
            onClick={() => setIsVisible(true)}
          >
            Generate Lookbook Prompt
          </button>
        </div>
      </div>

      <p className="prompt-note">
        Attach the wardrobe catalogue PDF and any required item images when pasting this prompt into ChatGPT.
      </p>

      {promptResult.canGenerate && isVisible ? (
        <pre className="prompt-output">{promptResult.prompt}</pre>
      ) : (
        <p className="prompt-empty">
          {promptResult.canGenerate
            ? "Generate the prompt to review the finished ChatGPT-ready lookbook instruction block."
            : promptResult.reason}
        </p>
      )}
    </article>
  );
}
