declare module "mammoth/mammoth.browser" {
  export type ConvertToMarkdownResult = {
    value: string;
    messages?: Array<{ message: string; type: string }>;
  };

  export type ConvertToHtmlResult = {
    value: string;
    messages?: Array<{ message: string; type: string }>;
  };

  export function convertToMarkdown(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<ConvertToMarkdownResult>;

  export function convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<ConvertToHtmlResult>;
}
