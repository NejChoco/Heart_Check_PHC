"use client";

import { useState } from "react";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";

interface ExportExcelButtonProps {
  range: string; // "90d" | "180d" | "365d" | "all"
  service?: string;
  status?: string;
}

export default function ExportExcelButton({ range, service, status }: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range });
      if (service) params.set("service", service);
      if (status) params.set("status", status);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/export-excel?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error("Export failed — try a different date range.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phc_patients_export_${range}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {isExporting ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconDownload className="h-4 w-4" />}
        {isExporting ? "Exporting..." : "Export to Excel"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}