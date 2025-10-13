declare module 'pdf-parse' {
  export function pdf(data: ArrayBufferView | ArrayBuffer | Blob | URL): Promise<string>;
}
