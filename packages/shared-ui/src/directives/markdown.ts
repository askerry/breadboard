/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { noChange } from "lit";
import {
  Directive,
  DirectiveParameters,
  Part,
  directive,
} from "lit/directive.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import MarkdownIt from "markdown-it";

class MarkdownDirective extends Directive {
  #markdownIt = MarkdownIt({
    highlight: (str, lang) => {
      switch (lang) {
        case "html": {
          return `<iframe class="html-view" srcdoc="${this.#escapeSrcdoc(str)}" sandbox></iframe>`;
        }

        default:
          return this.#escapeSrcdoc(str);
      }
    },
  });
  #lastValue: string | null = null;

  #escapeSrcdoc = (str: string) => {
    const htmlEntities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return str.replace(/[&<>"']/g, (char) => htmlEntities[char]);
  };

  update(_part: Part, [value]: DirectiveParameters<this>) {
    if (this.#lastValue === value) {
      return noChange;
    }

    this.#lastValue = value;
    return this.render(value);
  }

  /**
   * Renders the markdown string to HTML using MarkdownIt.
   *
   * Note: MarkdownIt doesn't enable HTML in its output, so we render the
   * value directly without further sanitization.
   * @see https://github.com/markdown-it/markdown-it/blob/master/docs/security.md
   */
  render(value: string) {
    const htmlString = this.#markdownIt.render(value);
    return unsafeHTML(htmlString);
  }
}

export const markdown = directive(MarkdownDirective);

const markdownItStandalone = MarkdownIt();
export function renderMarkdownToHtmlString(value: string): string {
  return markdownItStandalone.render(value);
}
