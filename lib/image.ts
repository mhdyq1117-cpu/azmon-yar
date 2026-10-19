"use client";

/**
 * فشرده‌سازی تصویر انتخاب‌شده کاربر پیش از ذخیره در دیتابیس
 * خروجی: Data URL با فرمت JPEG، حداکثر عرض ۱۰۰۰ پیکسل
 */
export function compressImageFile(file: File, maxW = 1000, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("فایل انتخاب‌شده تصویر نیست."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("فایل تصویر معتبر نیست."));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxW / Math.max(img.width, 1));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("پردازش تصویر ناموفق بود."));
            return;
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (e) {
          reject(e instanceof Error ? e : new Error("پردازش تصویر ناموفق بود."));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
