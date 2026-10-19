"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Undo2, Trash2, Check, Pencil, Eraser } from "lucide-react";
import { Spinner } from "./shared";

/** نرمال‌سازی مختصات برای پایداری در برابر تغییر اندازه */
interface Stroke {
  color: string;
  size: number; // px در مقیاس CSS
  mode: "pen" | "eraser";
  points: { x: number; y: number }[]; // نسبت ۰..۱
}

const PEN_COLORS = [
  { hex: "#1e293b", name: "مشکی" },
  { hex: "#2563eb", name: "آبی" },
  { hex: "#dc2626", name: "قرمز" },
  { hex: "#16a34a", name: "سبز" },
  { hex: "#ea580c", name: "نارنجی" },
];
const PEN_SIZES = [3, 6, 11];
const ERASER_SIZE = 30;

interface CanvasPadProps {
  title: string;
  initialImage?: string | null;
  /** حالت یادداشت‌برداری روی تصویر سوال — پاک‌کن فقط خطوط را پاک می‌کند و تصویر حفظ می‌شود */
  annotationMode?: boolean;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

/**
 * تخته سفید لمسی پیشرفته — مشابه یادداشت‌برداری گوشی‌های سامسونگ
 * با خطوط نرم، رنگ، ضخامت، پاک‌کن، واگرد و پاک‌کردن کامل
 */
export function CanvasPad({ title, initialImage, annotationMode, onSave, onCancel }: CanvasPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const dprRef = useRef(1);

  const [color, setColor] = useState(PEN_COLORS[0].hex);
  const [size, setSize] = useState(1); // ایندکس ضخامت
  const [eraser, setEraser] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [hasBgImage, setHasBgImage] = useState(Boolean(initialImage));
  const [saving, setSaving] = useState(false);

  /** رسم کامل همه خطوط روی بوم */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // پس‌زمینه سفید مثل کاغذ (در حالت یادداشت، زیر تصویر قرار می‌گیرد)
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    if (bgImageRef.current) {
      const img = bgImageRef.current;
      const r = Math.min(w / img.width, h / img.height);
      const dw = img.width * r;
      const dh = img.height * r;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const all = drawingRef.current ? [...strokesRef.current, drawingRef.current] : strokesRef.current;
    for (const s of all) {
      if (s.points.length === 0) continue;
      // در حالت یادداشت روی تصویر، پاک‌کن فقط خطوط را حذف می‌کند (destination-out)
      ctx.globalCompositeOperation =
        s.mode === "eraser" && annotationMode ? "destination-out" : "source-over";
      ctx.strokeStyle = s.mode === "eraser" && !annotationMode ? "#ffffff" : s.color;
      ctx.lineWidth = s.size * dprRef.current;
      ctx.beginPath();
      const p0 = { x: s.points[0].x * w, y: s.points[0].y * h };
      ctx.moveTo(p0.x, p0.y);
      if (s.points.length === 1) {
        ctx.lineTo(p0.x + 0.01, p0.y + 0.01);
      } else {
        for (let i = 1; i < s.points.length; i++) {
          const prev = { x: s.points[i - 1].x * w, y: s.points[i - 1].y * h };
          const cur = { x: s.points[i].x * w, y: s.points[i].y * h };
          const mid = { x: (prev.x + cur.x) / 2, y: (prev.y + cur.y) / 2 };
          ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
        }
        const last = s.points[s.points.length - 1];
        ctx.lineTo(last.x * w, last.y * h);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  /** هماهنگ‌سازی اندازه بوم با ظرف */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    dprRef.current = dpr;
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        bgImageRef.current = img;
        setHasBgImage(true);
        resizeCanvas();
      };
      img.src = initialImage;
    } else {
      resizeCanvas();
    }
    const ro = new ResizeObserver(() => resizeCanvas());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
     
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = {
      color,
      size: eraser ? ERASER_SIZE : PEN_SIZES[size],
      mode: eraser ? "eraser" : "pen",
      points: [pos(e)],
    };
    redraw();
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    // استفاده از رویدادهای هم‌زمان برای نرمی بیشتر روی قلم فعال
    const native = e.nativeEvent as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] };
    const rect = e.currentTarget.getBoundingClientRect();
    const extra = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    if (extra.length > 0) {
      for (const ev of extra) {
        drawingRef.current.points.push({
          x: (ev.clientX - rect.left) / rect.width,
          y: (ev.clientY - rect.top) / rect.height,
        });
      }
    } else {
      drawingRef.current.points.push(pos(e));
    }
    redraw();
  }

  function onUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    strokesRef.current.push(drawingRef.current);
    drawingRef.current = null;
    setCanUndo(true);
    redraw();
  }

  function undo() {
    strokesRef.current.pop();
    setCanUndo(strokesRef.current.length > 0);
    redraw();
  }

  function clearAll() {
    strokesRef.current = [];
    setCanUndo(false);
    redraw();
  }

  /** ذخیره: فشرده‌سازی به حداکثر عرض ۱۰۰۰px برای حجم سبک ارسال */
  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const maxW = 1000;
      const scale = Math.min(1, maxW / canvas.width);
      if (scale >= 1) {
        onSave(canvas.toDataURL("image/png"));
      } else {
        const out = document.createElement("canvas");
        out.width = Math.round(canvas.width * scale);
        out.height = Math.round(canvas.height * scale);
        const octx = out.getContext("2d");
        if (octx) {
          octx.fillStyle = "#ffffff";
          octx.fillRect(0, 0, out.width, out.height);
          octx.imageSmoothingQuality = "high";
          octx.drawImage(canvas, 0, 0, out.width, out.height);
        }
        onSave(out.toDataURL("image/png"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="تخته سفید پاسخ‌دهی"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="anim-pop mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* سربرگ ابزارها */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Pencil className="h-4.5 w-4.5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-slate-700">{title}</p>
              <p className="text-[11px] text-slate-400">
                {annotationMode ? "روی تصویر سوال یادداشت بزنید و رسم کنید" : "با انگشت یا قلم بنویسید و رسم کنید"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* رنگ‌ها */}
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-1.5">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  disabled={eraser}
                  title={c.name}
                  aria-label={`رنگ ${c.name}`}
                  onClick={() => {
                    setColor(c.hex);
                    setEraser(false);
                  }}
                  className={`h-7 w-7 rounded-full transition-all duration-200 disabled:opacity-30 ${
                    !eraser && color === c.hex
                      ? "scale-110 ring-2 ring-violet-500 ring-offset-2"
                      : "ring-1 ring-slate-200 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            {/* ضخامت */}
            {!eraser && (
              <div className="flex items-center gap-1 rounded-xl bg-slate-50 p-1.5">
                {PEN_SIZES.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    title={["نازک", "متوسط", "ضخیم"][i]}
                    onClick={() => setSize(i)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                      size === i ? "bg-violet-100 ring-1.5 ring-violet-400" : "hover:bg-white"
                    }`}
                  >
                    <span
                      className="rounded-full bg-slate-700"
                      style={{ width: 3 + i * 2.5, height: 3 + i * 2.5 }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* پاک‌کن / واگرد / پاک‌کردن همه */}
            <button
              type="button"
              onClick={() => setEraser((v) => !v)}
              aria-pressed={eraser}
              className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all ${
                eraser ? "bg-amber-100 text-amber-700 ring-1.5 ring-amber-300" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Eraser className="h-4 w-4" />
              پاک‌کن
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-50 px-3 text-xs font-bold text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" />
              واگرد
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-rose-50 px-3 text-xs font-bold text-rose-500 transition-all hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              پاک کردن همه
            </button>
          </div>
        </div>

        {/* بوم */}
        <div ref={wrapRef} className="relative min-h-0 flex-1 bg-white">
          <canvas
            ref={canvasRef}
            className="canvas-pad absolute inset-0"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerLeave={onUp}
            aria-label="محیط نوشتن با دست"
          />
          {strokesRef.current.length === 0 && !hasBgImage && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm font-medium text-slate-200">اینجا بنویسید یا شکل بکشید...</p>
            </div>
          )}
          {strokesRef.current.length === 0 && hasBgImage && annotationMode && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <span className="rounded-full bg-slate-900/60 px-4 py-1.5 text-[11px] font-bold text-white backdrop-blur">
                برای حل مسئله، روی تصویر یادداشت بزنید
              </span>
            </div>
          )}
        </div>

        {/* پاصففرمان */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X className="h-4 w-4" /> انصراف
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-extrabold text-white"
          >
            {saving ? <Spinner className="h-4 w-4" /> : <Check className="h-4.5 w-4.5" />}
            ذخیره پاسخ
          </button>
        </div>
      </div>
    </div>
  );
}
