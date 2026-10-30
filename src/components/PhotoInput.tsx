"use client";

// Phone cameras take 3 to 8 MB photos, which are too big to send (the server stops at about 4 MB).
// This file input shrinks a picked photo in the browser to a JPEG of at most 1600 px before the form sends it.
// PDFs, and photos the browser can't read, are sent as they are.

const MAX_SIDE = 1600;

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function PhotoInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const small = await shrink(file);
      if (small !== file) {
        const dt = new DataTransfer();
        dt.items.add(small);
        input.files = dt.files;
      }
    } catch {
      // Leave the original file; the server says if it's too big.
    }
  }
  return <input type="file" {...props} onChange={onChange} />;
}
