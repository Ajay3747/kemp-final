import React, { useRef, useState } from "react";
import { FileUp, CheckCircle, AlertCircle, RotateCcw, X } from "lucide-react";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export function validateIdCardFile(file) {
  if (!file) return "This image is required.";

  const extension = (file.name.match(/\.[^.]+$/) || [""])[0].toLowerCase();
  const extensionOk = ALLOWED_EXTENSIONS.includes(extension);
  const typeOk = ALLOWED_TYPES.includes(file.type);

  if (!extensionOk || !typeOk) {
    return "Only JPG, JPEG and PNG images are allowed.";
  }

  if (file.size > MAX_SIZE_BYTES) {
    return "ID card image must be less than 5 MB.";
  }

  return null;
}

/**
 * Two-sided ID card upload field: dropzone + preview + replace/remove.
 * Fully controlled — the parent owns the File object and error string so
 * both front and back sides can be validated the same way before submit.
 */
export default function IdCardUploadField({ id, label, file, previewUrl, error, onSelect, onRemove }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList) => {
    const selected = fileList && fileList[0];
    if (!selected) return;
    onSelect(selected);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="mb-4">
      <label className="text-white/80 font-medium mb-2 flex items-center gap-2">
        <FileUp size={16} className="text-yellow-400" />
        Institution ID Card &mdash; {label}
        <span className="text-red-400">*</span>
      </label>

      {!file ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => handleFiles(event.target.files)}
            className="hidden"
            id={id}
          />
          <label
            htmlFor={id}
            className={`block w-full p-4 rounded-xl border-2 border-dashed text-center font-medium cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                : "border-white/30 bg-white/5 text-white/70 hover:border-yellow-400 hover:bg-yellow-400/5"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileUp size={18} />
              <span>Upload {label}</span>
            </div>
            <p className="text-xs text-white/50 mt-1">PNG, JPG, JPEG &middot; Maximum 5 MB</p>
          </label>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-white/20 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={`${label} preview`}
                className="w-20 h-14 object-cover rounded-lg border border-white/20 flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle size={16} />
                <span>{label} uploaded</span>
              </div>
              <p className="text-white/50 text-xs truncate mt-0.5">{file.name}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                title="Replace"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Remove"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => handleFiles(event.target.files)}
            className="hidden"
            id={id}
          />
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-400 text-sm font-medium">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
