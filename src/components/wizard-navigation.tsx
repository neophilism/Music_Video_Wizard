"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface WizardNavigationStep {
  key: string;
  ordinal: number;
  phase: string;
  title: string;
  status: string;
  locked: boolean;
  selected: boolean;
}

export function WizardNavigation(props: {
  projectId: string;
  steps: WizardNavigationStep[];
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  let previousPhase = "";

  async function navigate(stepKey: string) {
    setPendingKey(stepKey);
    try {
      await fetch(
        `/api/projects/${props.projectId}/wizard/navigate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stepKey })
        }
      );
    } finally {
      router.push(
        `/app/projects/${props.projectId}/wizard?step=${encodeURIComponent(stepKey)}` as Route
      );
      setPendingKey(null);
    }
  }

  return (
    <nav className="wizardNav" aria-label="Music video wizard">
      {props.steps.map((step) => {
        const showPhase = step.phase !== previousPhase;
        previousPhase = step.phase;

        return (
          <div key={step.key}>
            {showPhase ? (
              <p className="wizardPhase">{step.phase}</p>
            ) : null}
            <button
              className={
                "wizardNavStep" +
                (step.selected ? " wizardNavStepActive" : "")
              }
              type="button"
              onClick={() => navigate(step.key)}
              disabled={pendingKey !== null}
            >
              <span className="wizardNavOrdinal">
                {String(step.ordinal / 10 + 1).padStart(2, "0")}
              </span>
              <span className="wizardNavCopy">
                <strong>{step.title}</strong>
                <small>
                  {step.locked ? "LOCKED · " : ""}
                  {step.status.replaceAll("_", " ")}
                </small>
              </span>
              {pendingKey === step.key ? (
                <span className="wizardNavPending">…</span>
              ) : null}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
