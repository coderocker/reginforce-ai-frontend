import type { DocumentType } from "../types/api";

export interface DocTypeOption {
  value: DocumentType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const DOC_TYPE_OPTIONS: DocTypeOption[] = [
  {
    value: "regulation",
    label: "Regulation",
    description: "GDPR, CCPA, HIPAA, ISO 27001, SOC 2, etc.",
    icon: "⚖️",
    color: "red",
  },
  {
    value: "policy",
    label: "Internal Policy",
    description: "Your company data handling & compliance policies",
    icon: "📋",
    color: "blue",
  },
  {
    value: "oss_license",
    label: "OSS License",
    description: "MIT, GPL, Apache, BSD, etc. license files",
    icon: "📜",
    color: "green",
  },
  {
    value: "oss_policy",
    label: "Engineering Guidelines",
    description: "Internal development standards & procedures",
    icon: "⚙️",
    color: "purple",
  },
  {
    value: "copyright_statute",
    label: "Copyright Law",
    description: "Copyright Act, Digital Millennium Act, etc.",
    icon: "©️",
    color: "orange",
  },
];

interface DocumentTypeSelectorProps {
  readonly selectedType: DocumentType;
  readonly onTypeChange: (type: DocumentType) => void;
  readonly disabled?: boolean;
}

export function DocumentTypeSelector({
  selectedType,
  onTypeChange,
  disabled = false,
}: DocumentTypeSelectorProps) {
  const selectedOption = DOC_TYPE_OPTIONS.find((opt) => opt.value === selectedType);

  return (
    <fieldset className="space-y-3">
      <legend className="block text-sm font-medium text-gray-700">
        Document Type *
      </legend>
      <div className="grid grid-cols-1 gap-2">
        {DOC_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => !disabled && onTypeChange(option.value)}
            disabled={disabled}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              selectedType === option.value
                ? `border-${option.color}-500 bg-${option.color}-50`
                : "border-gray-200 bg-white hover:border-gray-300"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{option.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </div>
              {selectedType === option.value && (
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
      {selectedOption && (
        <p className="text-xs text-gray-500">
          ✓ All documents are indexed to RAG for context-aware chat retrieval
        </p>
      )}
    </fieldset>
  );
}
