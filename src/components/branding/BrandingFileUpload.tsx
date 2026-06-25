import { useRef, useState } from "react";

interface BrandingFileUploadProps {
  readonly label: string;
  readonly hint: string;
  readonly accept: string;
  readonly disabled?: boolean;
  readonly onValidatedFile: (file: File) => void;
  readonly validate: (file: File) => Promise<string | null>;
}

export function BrandingFileUpload({
  label,
  hint,
  accept,
  disabled,
  onValidatedFile,
  validate,
}: BrandingFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setChecking(true);
    setError(null);
    const validationError = await validate(file);
    setChecking(false);

    if (validationError) {
      setError(validationError);
      return;
    }
    onValidatedFile(file);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <p className="text-xs text-gray-500">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled || checking}
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled || checking}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 w-fit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {checking ? "Checking…" : "Choose file"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
