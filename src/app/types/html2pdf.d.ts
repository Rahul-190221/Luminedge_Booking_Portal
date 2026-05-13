declare module "html2pdf.js" {
    const html2pdf: any;
    export default html2pdf;
  }

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
