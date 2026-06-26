import { useState } from "react";
import { Card } from "../ui/Card";

export interface HelpFlowStep {
  icon: string;
  label: string;
  detail?: string;
}

export interface HelpLegendItem {
  label: string;
  description: string;
  badgeClass?: string;
}

export interface ModuleHelpPanelProps {
  title?: string;
  summary: string;
  steps?: HelpFlowStep[];
  bullets?: string[];
  legend?: HelpLegendItem[];
  defaultOpen?: boolean;
}

export function ModuleHelpPanel({
  title = "How it works",
  summary,
  steps,
  bullets,
  legend,
  defaultOpen = false,
}: ModuleHelpPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-emerald-50/60 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0" aria-hidden>
            ℹ️
          </span>
          <div className="min-w-0">
            <span className="font-semibold text-sm text-gray-900">{title}</span>
            {!open && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{summary}</p>
            )}
          </div>
        </div>
        <span className="text-gray-400 text-sm shrink-0" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-emerald-100/80">
          <p className="text-sm text-gray-700 pt-4">{summary}</p>

          {steps && steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Workflow
              </p>
              <div className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-0">
                {steps.map((step, i) => (
                  <div key={step.label} className="flex flex-col md:flex-row md:items-center flex-1 min-w-0">
                    <div className="flex-1 rounded-lg border border-emerald-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-xl shrink-0" aria-hidden>
                          {step.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-emerald-800">
                            {i + 1}. {step.label}
                          </div>
                          {step.detail && (
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{step.detail}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className="hidden md:flex items-center justify-center px-1 text-emerald-400 font-bold shrink-0"
                        aria-hidden
                      >
                        →
                      </div>
                    )}
                    {i < steps.length - 1 && (
                      <div className="flex md:hidden justify-center py-1 text-emerald-400 text-sm" aria-hidden>
                        ↓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {bullets && bullets.length > 0 && (
            <ul className="text-sm text-gray-700 space-y-1.5 list-disc pl-5">
              {bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          {legend && legend.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Key outcomes
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {legend.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-gray-200 bg-white p-2.5 text-xs"
                  >
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-semibold mb-1 ${
                        item.badgeClass ?? "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.label}
                    </span>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
