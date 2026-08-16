"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importCsvAction, getImportTemplateAction } from "@/actions/import";
import {
  IMPORT_COLUMN_DEFS,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  parseCsvToRows,
  type ImportColumnKey,
  type ImportSummary,
  type ParsedCsv,
} from "@/lib/import-csv";

const STEPS = ["انتخاب فایل", "پیش‌نمایش", "نتیجه"] as const;
type Step = (typeof STEPS)[number];

const COLUMN_LABEL = Object.fromEntries(
  IMPORT_COLUMN_DEFS.map((def) => [def.key, def.labels[0]])
) as Record<ImportColumnKey, string>;

const ENTITY_LABEL: Record<string, string> = {
  company: "شرکت",
  contact: "مشتری",
  deal: "فرصت",
};

export function ImportCsvDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("انتخاب فایل");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function reset() {
    setStep("انتخاب فایل");
    setFile(null);
    setContent("");
    setFileError(null);
    setParsed(null);
    setActionError(null);
    setSummary(null);
    setImporting(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    if (!next) return;
    if (next.size > IMPORT_MAX_BYTES) {
      setFile(null);
      setContent("");
      setFileError("حجم فایل بیشتر از حد مجاز است (۲ مگابایت)");
      return;
    }
    setFileError(null);
    setFile(next);
    try {
      setContent(await next.text());
    } catch {
      setFile(null);
      setContent("");
      setFileError("خواندن فایل ناموفق بود");
    }
  }

  async function handleTemplateDownload() {
    setDownloading(true);
    const result = await getImportTemplateAction();
    setDownloading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const template = result.data;
    if (!template) {
      toast.error("دریافت قالب ناموفق بود");
      return;
    }
    const blob = new Blob([template.content], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = template.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("قالب ایمپورت دانلود شد");
  }

  function goToPreview() {
    if (!content) {
      setFileError("فایلی انتخاب نشده است");
      return;
    }
    try {
      const result = parseCsvToRows(content);
      if (result.rows.length === 0) {
        setFileError("هیچ ردیف داده‌ای در فایل پیدا نشد");
        return;
      }
      if (result.rows.length > IMPORT_MAX_ROWS) {
        setFileError(
          `تعداد ردیف‌ها بیشتر از حد مجاز است (حداکثر ${IMPORT_MAX_ROWS.toLocaleString("fa-IR")} ردیف)`
        );
        return;
      }
      if (result.headers.length === 0) {
        setFileError("هیچ ستون شناخته‌شده‌ای پیدا نشد؛ از قالب نمونه استفاده کنید.");
        return;
      }
      setParsed(result);
      setActionError(null);
      setStep("پیش‌نمایش");
    } catch {
      setFileError("فرمت CSV نامعتبر است");
    }
  }

  async function handleImport() {
    setImporting(true);
    setActionError(null);
    const result = await importCsvAction({ csv: content });
    setImporting(false);
    if (!result.ok) {
      setActionError(result.error ?? null);
      return;
    }
    setSummary(result.data ?? null);
    setStep("نتیجه");
    router.refresh();
  }

  const stepIndex = STEPS.indexOf(step);
  const previewRows = parsed?.rows.slice(0, 8) ?? [];

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
        <Upload className="size-4" />
        ایمپورت CSV
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>ایمپورت CSV</DialogTitle>
            <DialogDescription>
              وارد کردن دسته‌جمعی مشتریان، شرکت‌ها و فرصت‌های فروش از فایل CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2" dir="rtl">
            {STEPS.map((label, i) => (
              <Fragment key={label}>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      i < stepIndex
                        ? "bg-emerald-500 text-white"
                        : i === stepIndex
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i < stepIndex ? <CheckCircle2 className="size-4" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      i === stepIndex
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <Separator className="hidden w-8 sm:block" />
                )}
              </Fragment>
            ))}
          </div>

          {step === "انتخاب فایل" && (
            <div className="space-y-4">
              <label
                htmlFor="csv-file"
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center transition-colors sm:p-8",
                  file
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "hover:bg-muted/50"
                )}
              >
                <FileText className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {file ? file.name : "برای انتخاب فایل کلیک کنید"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} کیلوبایت`
                    : "فرمت CSV — حداکثر ۲ مگابایت و ۵,۰۰۰ ردیف"}
                </span>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <span className="truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ms-auto"
                    onClick={() => {
                      setFile(null);
                      setContent("");
                      setFileError(null);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}

              {fileError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {fileError}
                </div>
              )}

              <div>
                <div className="mb-2 text-sm font-medium">ستون‌های پشتیبانی‌شده</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                  {IMPORT_COLUMN_DEFS.map((def) => (
                    <div
                      key={def.key}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      {def.labels[0]}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTemplateDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  دانلود قالب نمونه
                </Button>
                <Button size="sm" onClick={goToPreview} disabled={!content}>
                  ادامه
                  <ArrowLeft className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "پیش‌نمایش" && parsed && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>
                  تعداد ردیف: {parsed.rows.length.toLocaleString("fa-IR")}
                </span>
                <span>
                  ستون‌های شناسایی‌شده: {parsed.headers.length}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ردیف</TableHead>
                      {parsed.headers.map((h) => (
                        <TableHead key={h.key}>{COLUMN_LABEL[h.key]}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r) => (
                      <TableRow key={r.rowNumber}>
                        <TableCell className="text-muted-foreground">
                          {r.rowNumber}
                        </TableCell>
                        {parsed.headers.map((h) => (
                          <TableCell key={h.key} className="max-w-40 truncate">
                            {r.values[h.key] || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsed.rows.length > previewRows.length && (
                <p className="text-xs text-muted-foreground">
                  نمایش {previewRows.length} ردیف از{" "}
                  {parsed.rows.length.toLocaleString("fa-IR")} ردیف
                </p>
              )}

              {actionError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("انتخاب فایل")}
                  disabled={importing}
                >
                  <ArrowRight className="size-4" />
                  بازگشت
                </Button>
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {importing ? "در حال پردازش…" : "ایمپورت"}
                </Button>
              </div>
            </div>
          )}

          {step === "نتیجه" && summary && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>
                  ایمپورت با موفقیت انجام شد —{" "}
                  {summary.totalRows.toLocaleString("fa-IR")} ردیف پردازش شد.
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="truncate text-xl font-bold sm:text-2xl">
                    {summary.created.companies.toLocaleString("fa-IR")}
                  </div>
                  <div className="text-xs text-muted-foreground">شرکت‌ها</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="truncate text-xl font-bold sm:text-2xl">
                    {summary.created.contacts.toLocaleString("fa-IR")}
                  </div>
                  <div className="text-xs text-muted-foreground">مشتریان</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="truncate text-xl font-bold sm:text-2xl">
                    {summary.created.deals.toLocaleString("fa-IR")}
                  </div>
                  <div className="text-xs text-muted-foreground">فرصت‌ها</div>
                </div>
              </div>

              {summary.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    خطاهای ردیف‌ها ({summary.errors.length.toLocaleString("fa-IR")})
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">ردیف</TableHead>
                          <TableHead className="w-28">موجودیت</TableHead>
                          <TableHead>پیام</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.errors.map((err, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-muted-foreground">
                              {err.row}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {ENTITY_LABEL[err.entity] ?? err.entity}
                              </Badge>
                            </TableCell>
                            <TableCell className="break-words text-destructive">
                              {err.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <Button size="sm" onClick={() => handleOpenChange(false)}>
                  پایان
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
