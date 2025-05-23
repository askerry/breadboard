/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { LLMContent } from "@breadboard-ai/types";
import {
  isFileDataCapabilityPart,
  isInlineData,
} from "@google-labs/breadboard";
import { LitElement, html, css, HTMLTemplateResult, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import {
  convertShareUriToEmbedUri,
  convertWatchOrShortsUriToEmbedUri,
  isEmbedUri,
  isShareUri,
  isShortsUri,
  isWatchUri,
  videoIdFromWatchOrShortsOrEmbedUri,
} from "../../../utils/youtube";
import { icons } from "../../../styles/icons.js";

@customElement("bb-asset-shelf")
export class AssetShelf extends LitElement {
  @property()
  accessor name: string = "asset-shelf";

  static styles = [
    icons,
    css`
      :host {
        display: flex;
        overflow-x: scroll;
        overflow-y: hidden;
        scrollbar-width: none;
      }

      .value {
        display: block;
        height: 72px;
        aspect-ratio: 16/9;
        margin: var(--bb-grid-size-2) var(--bb-grid-size-2) 0 0;
        position: relative;
        flex: 0 0 auto;

        & > *:not(button) {
          object-fit: cover;
          width: 100%;
          height: 100%;
          border-radius: var(--bb-grid-size-2);
          box-sizing: border-box;
          --icon-size: 32px;

          > * {
            display: block;
            height: 100%;
            border-radius: var(--bb-grid-size-2);
          }
        }

        & .text,
        & .audio,
        & .gdrive {
          border: 1px solid var(--primary-color, var(--bb-neutral-300));
        }

        & .audio {
          background: var(--bb-icon-mic)
            var(--background-color, var(--bb-neutral-0)) center center / 20px
            20px no-repeat;
        }

        & .text {
          background: var(--bb-icon-text)
            var(--background-color, var(--bb-neutral-0)) center center / 20px
            20px no-repeat;
        }

        & .movie,
        & .csv,
        & .pdf {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color, var(--bb-neutral-300));
          background: var(--background-color, var(--bb-neutral-0));

          & .g-icon {
            font-size: var(--bb-grid-size-11);
          }
        }

        & .gdrive {
          background: var(--bb-icon-google-drive-outline)
            var(--background-color, var(--bb-neutral-0)) center center / 20px
            20px no-repeat;
        }

        & .delete {
          position: absolute;
          top: calc(-1 * var(--bb-grid-size-2));
          right: calc(-1 * var(--bb-grid-size-2));
          width: 20px;
          height: 20px;
          border: none;
          border-radius: 50%;
          font-size: 0;
          background: var(--secondary-color) var(--bb-icon-close) center
            center / 20px 20px no-repeat;
          z-index: 1;

          &:not([disabled]) {
            opacity: 1;
            cursor: pointer;
          }
        }
      }
    `,
  ];

  #assets: LLMContent[] = [];

  get value() {
    return this.#assets;
  }

  set value(assets: LLMContent[]) {
    this.#assets = assets;
  }

  addAsset(addedAsset: LLMContent) {
    this.#assets.push(addedAsset);
    requestAnimationFrame(() => {
      this.requestUpdate();
    });
  }

  removeAsset(removedAsset: LLMContent) {
    this.#assets = this.#assets.filter((asset) => asset !== removedAsset);
    this.dispatchEvent(new Event("assetchanged"));
    requestAnimationFrame(() => {
      this.requestUpdate();
    });
  }

  clear() {
    this.#assets = [];
    requestAnimationFrame(() => {
      this.requestUpdate();
    });
  }

  render() {
    return html`${repeat(this.#assets, (asset) => {
      return asset.parts.map((part) => {
        let value: HTMLTemplateResult | symbol = nothing;
        if (isInlineData(part)) {
          if (part.inlineData.mimeType.startsWith("image")) {
            value = html`<img
              src="data:${part.inlineData.mimeType};base64,${part.inlineData
                .data}"
            />`;
          } else if (part.inlineData.mimeType.startsWith("audio")) {
            value = html`<div class="audio"></div>`;
          } else if (part.inlineData.mimeType === "text/csv") {
            value = html`<div class="csv">
              <span class="g-icon">csv</span>
            </div>`;
          } else if (part.inlineData.mimeType.startsWith("text")) {
            value = html`<div class="text"></div>`;
          } else if (part.inlineData.mimeType.startsWith("video")) {
            value = html`<div class="movie">
              <span class="g-icon">movie</span>
            </div>`;
          } else if (part.inlineData.mimeType.includes("pdf")) {
            value = html`<div class="pdf">
              <span class="g-icon">drive_pdf</span>
            </div>`;
          }
        } else if (isFileDataCapabilityPart(part)) {
          switch (part.fileData.mimeType) {
            case "video/mp4": {
              let uri: string | null = part.fileData.fileUri;
              if (isWatchUri(uri) || isShortsUri(uri)) {
                uri = convertWatchOrShortsUriToEmbedUri(uri);
              } else if (isShareUri(uri)) {
                uri = convertShareUriToEmbedUri(uri);
              } else if (!isEmbedUri(uri)) {
                uri = null;
              }

              if (!isEmbedUri(uri) || uri === null) {
                value = html`Error`;
                break;
              }

              const videoId = videoIdFromWatchOrShortsOrEmbedUri(uri);
              value = html`<a href="https://www.youtube.com/watch?v=${videoId}">
                <img
                  src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg"
                />
              </a>`;
              break;
            }

            default: {
              if (
                part.fileData.mimeType.startsWith("application/vnd.google-apps")
              ) {
                value = html`<bb-google-drive-file-viewer
                  .fileId=${part.fileData.fileUri}
                ></bb-google-drive-file-viewer>`;
                break;
              }
            }
          }
        }

        return html` <div class="value">
          <button
            class="delete"
            @click=${() => {
              this.removeAsset(asset);
            }}
          >
            Delete
          </button>
          ${value}
        </div>`;
      });
    })}`;
  }
}
