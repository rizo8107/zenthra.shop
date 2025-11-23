import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (file: File | null, previewUrl: string) => void;
  onUrlChange?: (url: string) => void;
  accept?: string;
  className?: string;
  helpText?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  onUrlChange,
  accept = 'image/*',
  className,
  helpText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value);
  const [useUrl, setUseUrl] = useState<boolean>(!!value && value.startsWith('http'));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const previewUrl = reader.result as string;
        setPreview(previewUrl);
        onChange(file, previewUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPreview(url);
    if (onUrlChange) {
      onUrlChange(url);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange(null, '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Label>{label}</Label>
      
      {/* Toggle between upload and URL */}
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          variant={!useUrl ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUseUrl(false)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
        <Button
          type="button"
          variant={useUrl ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUseUrl(true)}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Use URL
        </Button>
      </div>

      {/* Upload or URL input */}
      {!useUrl ? (
        <div className="space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="cursor-pointer"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="url"
            value={preview}
            onChange={handleUrlChange}
            placeholder="https://example.com/image.png"
          />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative inline-block">
          <div className="border rounded-lg p-2 bg-muted/50">
            <img
              src={preview}
              alt="Preview"
              className="max-w-[200px] max-h-[200px] object-contain rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/e2e8f0/64748b?text=Invalid+Image';
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
};
