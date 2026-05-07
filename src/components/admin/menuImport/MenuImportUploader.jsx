import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';

// Çoklu görsel yükleyici. Yüklenen URL'leri parent'a iletir.
export default function MenuImportUploader({ images, onAdd, onRemove, uploading }) {
  const inputRef = useRef(null);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onAdd(Array.from(e.target.files || []))}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} alt={`Menü ${i + 1}`} className="w-full aspect-square object-cover rounded-xl border" />
            <button
              onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-xl border-2 border-dashed border-primary/40 bg-secondary/30 hover:bg-secondary/60 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span className="text-[10px] font-medium">{uploading ? 'Yükleniyor…' : 'Fotoğraf Ekle'}</span>
        </button>
      </div>

      {images.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {images.length} fotoğraf yüklendi · Birden fazla sayfayı sırayla ekleyebilirsiniz.
        </p>
      )}
    </div>
  );
}