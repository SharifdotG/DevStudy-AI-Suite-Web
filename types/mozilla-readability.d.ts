declare module "@mozilla/readability" {
  export interface ReadabilityOptions {
    debug?: boolean;
    maxElemsToParse?: number;
    nbTopCandidates?: number;
    charThreshold?: number;
    classesToPreserve?: string[];
    serializer?: (node: Node) => string;
  }

  export interface ReadabilityResult {
    title?: string;
    content?: string;
    textContent?: string;
    length?: number;
    excerpt?: string;
    byline?: string;
    dir?: "ltr" | "rtl" | null;
  }

  export class Readability {
    constructor(document: Document, options?: ReadabilityOptions);
    parse(): ReadabilityResult | null;
  }
}