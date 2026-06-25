import { useEffect, useState } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly confirmVariant?: "primary" | "secondary";
  readonly confirmClassName?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  confirmClassName,
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{message}</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            className={confirmClassName}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DoubleConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmText: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly loading?: boolean;
}

export function DoubleConfirmDialog({
  open,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  loading,
}: DoubleConfirmDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setTyped("");
    }
  }, [open]);

  if (!open) return null;

  if (step === 1) {
    return (
      <ConfirmDialog
        open
        title={title}
        message={message}
        confirmLabel="Continue"
        confirmClassName="bg-amber-600 hover:bg-amber-700 text-white"
        onCancel={onCancel}
        onConfirm={() => setStep(2)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900">Final confirmation</h3>
        <p className="text-sm text-gray-600 mt-2">
          Type <strong>{confirmText}</strong> to confirm deletion.
        </p>
        <input
          className="mt-4 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmText}
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            disabled={loading || typed !== confirmText}
            onClick={onConfirm}
          >
            {loading ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </div>
    </div>
  );
}
