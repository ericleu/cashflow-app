export interface ImageCapture {
  base64Image: string;
  mimeType: string;
  previewUrl: string;
}

export function openCamera(): Promise<ImageCapture | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Opens camera directly, no action sheet

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const previewUrl = URL.createObjectURL(file);
      const base64Image = await fileToBase64(file);
      resolve({ base64Image, mimeType: file.type, previewUrl });
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function openFilePicker(): Promise<ImageCapture | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // No `capture` attribute → goes to photo library on iOS

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const base64Image = await fileToBase64(file);
      resolve({ base64Image, mimeType: file.type, previewUrl });
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix: "data:image/jpeg;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
