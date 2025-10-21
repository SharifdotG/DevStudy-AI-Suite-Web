declare module "jsdom" {
  export interface JSDOMOptions {
    url?: string;
    contentType?: string;
    includeNodeLocations?: boolean;
    pretendToBeVisual?: boolean;
  }

  export class JSDOM {
    constructor(html?: string, options?: JSDOMOptions);
    window: Window & typeof globalThis;
  }
}