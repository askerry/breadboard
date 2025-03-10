/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as StringsHelper from "../../strings/helper.js";
const Strings = StringsHelper.forSection("AssetOrganizer");

import {
  css,
  html,
  HTMLTemplateResult,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/signals";
import { GraphAsset, Organizer } from "../../state";
import { repeat } from "lit/directives/repeat.js";
import { AssetMetadata, AssetPath } from "@breadboard-ai/types";
import { classMap } from "lit/directives/class-map.js";
import { OverflowAction } from "../../types/types.js";
import {
  OverflowMenuActionEvent,
  OverlayDismissedEvent,
  ToastEvent,
  ToastType,
} from "../../events/events.js";
import { createRef, ref, Ref } from "lit/directives/ref.js";
import { GoogleDriveFileId, LLMInput } from "../elements.js";
import {
  isFileDataCapabilityPart,
  isLLMContent,
} from "@google-labs/breadboard";
import { InputChangeEvent } from "../../plugins/input-plugin.js";
import { SIGN_IN_CONNECTION_ID } from "../../utils/signin-adapter.js";
import { styleMap } from "lit/directives/style-map.js";

const OVERFLOW_MENU_PADDING = 12;

@customElement("bb-asset-organizer")
export class AssetOrganizer extends SignalWatcher(LitElement) {
  @property()
  accessor state: Organizer | null = null;

  @property()
  accessor showAddOverflowMenu = false;
  #addOverflowLocation = {
    x: 0,
    y: 0,
  };

  @property()
  accessor showGDrive = false;

  @state()
  accessor asset: GraphAsset | null = null;

  @state()
  accessor editAssetTitle: GraphAsset | null = null;

  @property()
  accessor editAssetContent: GraphAsset | null = null;

  static styles = css`
    * {
      box-sizing: border-box;
    }

    :host {
      display: block;
      position: fixed;
      width: 100svw;
      height: 100svh;
      left: 0;
      top: 0;
    }

    #background {
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.05);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #add-drive-proxy,
    #add-asset-proxy {
      display: block;
      width: 0;
      height: 0;
      position: absolute;
      pointer-events: none;
      overflow: hidden;
    }

    #container {
      border: 1px solid var(--bb-neutral-300);
      background: var(--bb-neutral-0);
      border-radius: var(--bb-grid-size-2);
      display: flex;
      flex-direction: column;
      overflow: auto;

      width: 80svw;
      height: 70svh;
      max-width: 800px;
      max-height: 600px;

      box-shadow: var(--bb-elevation-5);

      & #add-asset-container {
        height: var(--bb-grid-size-11);
        display: flex;
        align-items: center;
        padding: 0 var(--bb-grid-size-3);
      }

      #edit-asset,
      #add-asset {
        font: 400 var(--bb-label-medium) / var(--bb-label-line-height-medium)
          var(--bb-font-family);
        border-radius: var(--bb-grid-size-16);
        height: var(--bb-grid-size-7);
        padding: 0 var(--bb-grid-size-3) 0 var(--bb-grid-size-7);
        background: var(--bb-neutral-100) var(--bb-icon-add) 6px center / 20px
          20px no-repeat;
        border: 1px solid var(--bb-neutral-200);
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: background-color 0.2s cubic-bezier(0, 0, 0.3, 1);

        &:hover,
        &:focus {
          background-color: Var(--bb-neutral-300);
        }
      }

      #edit-asset {
        background-image: var(--bb-icon-edit);
        margin-bottom: var(--bb-grid-size-4);

        &.save {
          background-image: var(--bb-icon-save);
        }
      }

      & header {
        display: flex;
        align-items: center;
        height: var(--bb-grid-size-11);
        padding: 0 var(--bb-grid-size-3) 0 var(--bb-grid-size-4);
        user-select: none;
        border-bottom: 1px solid var(--bb-neutral-300);

        & h1 {
          flex: 1;
          font: 400 var(--bb-label-large) / var(--bb-label-line-height-large)
            var(--bb-font-family);
          margin: 0;
          display: flex;
          align-items: center;

          &::before {
            content: "";
            display: block;
            width: 20px;
            height: 20px;
            background: var(--bb-icon-alternate-email) center center / 20px 20px
              no-repeat;
            margin-right: var(--bb-grid-size-2);
          }
        }

        & #toggle-viewer {
          cursor: pointer;
          display: none;
          border-radius: var(--bb-grid-size-16);
          align-items: center;
          font: 400 var(--bb-label-large) / var(--bb-label-line-height-large)
            var(--bb-font-family);
          height: var(--bb-grid-size-7);
          padding: 0 var(--bb-grid-size-3) 0 var(--bb-grid-size-8);
          background: var(--bb-icon-dock-to-right) 8px center / 20px 20px
            no-repeat;
          border: 1px solid transparent;
          margin-right: var(--bb-grid-size);
          transition:
            background-color 0.1s cubic-bezier(0, 0, 0.3, 1),
            border 0.1s cubic-bezier(0, 0, 0.3, 1);

          &:hover,
          &.active {
            background-color: var(--bb-ui-100);
            border: 1px solid var(--bb-ui-300);
          }
        }

        & #toggle-expanded {
          width: 20px;
          height: 20px;
          flex: 0 0 auto;
          background: var(--bb-icon-expand-content) center center / 20px 20px
            no-repeat;
          border: none;
          font-size: 0;
          cursor: pointer;

          opacity: 0.5;
          transition: opacity 0.2s cubic-bezier(0, 0, 0.3, 1);

          &:hover,
          &:focus {
            opacity: 1;
          }
        }
      }

      & #assets {
        flex: 1;
        overflow: auto;

        display: grid;
        grid-template-columns: 232px 1fr;

        bb-multi-output {
          display: block;
        }

        & #no-assets,
        & #no-asset-selected {
          color: var(--bb-neutral-900);
          font: 400 var(--bb-body-small) / var(--bb-body-line-height-small)
            var(--bb-font-family);
          padding: var(--bb-grid-size-3) var(--bb-grid-size-3);
        }

        & > section {
          display: flex;
          flex-direction: column;
        }

        & menu {
          margin: 0;
          padding: var(--bb-grid-size-2) var(--bb-grid-size-3);
          list-style: none;
          flex: 1 0 auto;
          overflow-y: scroll;
          overflow-x: hidden;
          width: 100%;
          display: block;

          & li {
            display: flex;
            align-items: center;
            margin-bottom: var(--bb-grid-size);

            & > span {
              display: block;
              width: calc(var(--bb-grid-size-6) + 2px);
              height: var(--bb-grid-size-7);

              &.content {
                background: var(--bb-neutral-0) var(--bb-icon-text) 4px center /
                  20px 20px no-repeat;

                &.youtube {
                  background: var(--bb-neutral-0) var(--bb-icon-youtube) 4px
                    center / 20px 20px no-repeat;
                }

                &.gdrive {
                  background: var(--bb-neutral-0)
                    var(--bb-icon-google-drive-outline) 4px center / 20px 20px
                    no-repeat;
                }
              }

              &.file {
                background: var(--bb-neutral-0) var(--bb-icon-attach) 4px
                  center / 20px 20px no-repeat;
              }
            }

            & input {
              flex: 1;
              height: var(--bb-grid-size-7);
              line-height: var(--bb-grid-size-7);
              font: 400 var(--bb-body-small) / var(--bb-body-line-height-small)
                var(--bb-font-family);
              border-radius: var(--bb-grid-size);
              padding: 0 var(--bb-grid-size);
            }

            & .asset {
              height: var(--bb-grid-size-7);
              background: var(--bb-ui-100) var(--bb-icon-text) 4px center / 20px
                20px no-repeat;
              border-radius: var(--bb-grid-size);
              display: block;
              align-items: center;
              font: 400 var(--bb-body-small) / var(--bb-body-line-height-small)
                var(--bb-font-family);
              border: none;
              padding: 0 var(--bb-grid-size-3) 0 var(--bb-grid-size-8);
              transition: background-color 0.1s cubic-bezier(0, 0, 0.3, 1);
              width: 100%;
              color: var(--bb-neutral-900);
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
              text-align: left;

              &.content {
                background: var(--bb-ui-100) var(--bb-icon-text) 4px center /
                  20px 20px no-repeat;
              }

              &.youtube {
                background: var(--bb-ui-100) var(--bb-icon-youtube) 4px center /
                  20px 20px no-repeat;
              }

              &.gdrive {
                background: var(--bb-ui-100) var(--bb-icon-google-drive-outline)
                  4px center / 20px 20px no-repeat;
              }

              &.file {
                background: var(--bb-ui-100) var(--bb-icon-attach) 4px center /
                  20px 20px no-repeat;
              }

              &:not(.active) {
                cursor: pointer;
                background-color: var(--bb-neutral-0);

                &:hover,
                &:focus {
                  background-color: var(--bb-neutral-50);
                }
              }
            }

            & .delete {
              margin-left: var(--bb-grid-size-2);
              width: 20px;
              height: 20px;
              background: transparent var(--bb-icon-delete) center center / 20px
                20px no-repeat;
              font-size: 0;
              border: none;
              opacity: 0.5;
              transition: opacity 0.2s cubic-bezier(0, 0, 0.3, 1);
              cursor: pointer;

              &:hover,
              &:focus {
                opacity: 1;
              }
            }
          }
        }

        & #details {
          --output-value-padding-y: var(--bb-grid-size-3);

          display: flex;
          border-left: 1px solid var(--bb-neutral-300);

          width: 100%;
          padding: var(--bb-grid-size-2) var(--bb-grid-size-3)
            var(--bb-grid-size-3) var(--bb-grid-size-3);
          overflow-y: scroll;
          overflow-x: hidden;

          &.padded {
            padding-top: var(--bb-grid-size-5);
          }

          bb-multi-output {
            width: 100%;
          }
        }
      }
    }

    bb-overflow-menu {
      position: absolute;
      left: 0;
      top: 0;
      width: 220px;
    }
  `;

  #addDriveInputRef: Ref<GoogleDriveFileId> = createRef();
  #uploadInputRef: Ref<HTMLInputElement> = createRef();
  #renameInputRef: Ref<HTMLInputElement> = createRef();
  #contentInputRef: Ref<LLMInput> = createRef();

  #showAsset(asset: GraphAsset) {
    this.asset = asset;
  }

  #deleting = false;
  async #deleteAsset(asset: AssetPath) {
    if (!this.state) {
      return;
    }

    this.#deleting = true;
    await this.state.removeGraphAsset(asset);
    if (this.asset && this.asset.path === asset) {
      this.asset = null;
    }
    this.#deleting = false;
  }

  #attemptUploadAsset() {
    if (!this.#uploadInputRef.value) {
      return;
    }

    this.#uploadInputRef.value.click();
  }

  async #attemptUpdateAssetTitle(asset: GraphAsset, title: string) {
    const metadata: AssetMetadata = asset.metadata ?? {
      title: title,
      type: "file",
    };

    metadata.title = title;

    await this.state?.changeGraphAssetMetadata(asset.path, metadata);
    this.asset = asset;
  }

  async #attemptCreateEmptyContentAsset() {
    if (!this.state) {
      return;
    }

    const path = globalThis.crypto.randomUUID();
    await this.state.addGraphAsset({
      path,
      metadata: {
        title: "Untitled Content",
        type: "content",
      },
      data: [
        {
          parts: [
            {
              text: "Place your content here",
            },
          ],
          role: "user",
        },
      ],
    });

    const asset = this.state.graphAssets.get(path);
    if (asset) {
      this.asset = asset;
    }
  }

  async #attemptGDrivePickerFlow() {
    if (!this.#addDriveInputRef.value) {
      return;
    }

    try {
      this.#addDriveInputRef.value.triggerFlow();
    } catch (err) {
      this.dispatchEvent(
        new ToastEvent("Unable to load Google Drive", ToastType.ERROR)
      );
    }
  }

  async #attemptCreateFileDataAsset(
    mimeType = "",
    title = "Untitled File Data",
    fileUri = "",
    subType?: string
  ) {
    if (!this.state) {
      return;
    }

    const metadata: AssetMetadata = {
      title,
      type: "content",
    };

    if (subType) {
      metadata.subType = subType;
    }

    const path = globalThis.crypto.randomUUID();
    await this.state.addGraphAsset({
      path,
      metadata,
      data: [
        {
          parts: [
            {
              fileData: {
                fileUri,
                mimeType,
              },
            },
          ],
          role: "user",
        },
      ],
    });

    const asset = this.state.graphAssets.get(path);
    if (asset) {
      this.asset = asset;
    }
  }

  #attemptUpdateAsset() {
    if (!this.#contentInputRef.value || !this.editAssetContent) {
      return;
    }

    if (isLLMContent(this.#contentInputRef.value.value)) {
      this.editAssetContent.data = [this.#contentInputRef.value.value];
    } else {
      console.warn("No LLM Content found");
    }

    this.editAssetContent = null;
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("asset")) {
      this.editAssetContent = null;
    }
  }

  protected updated(): void {
    if (this.editAssetTitle && this.#renameInputRef.value) {
      this.#renameInputRef.value.select();
    }
  }

  render() {
    const assetData = this.asset?.data?.at(-1) || null;
    const assets = this.state?.graphAssets;
    const isFileData = this.asset?.data.some((content) =>
      content.parts.some((part) => isFileDataCapabilityPart(part))
    );
    const hasEditableParts = !isFileData;
    const supportedExportControls = { drive: false, clipboard: false };

    if (this.asset) {
      const type = this.asset.metadata?.type;
      const subType = this.asset.metadata?.subType;
      supportedExportControls.clipboard = subType !== "gdrive";
      supportedExportControls.drive =
        type === "content" && subType !== "gdrive" && subType !== "youtube";
    }

    let addOverflowMenu: HTMLTemplateResult | symbol = nothing;
    if (this.showAddOverflowMenu) {
      const actions: OverflowAction[] = [
        { icon: "upload", title: "Upload from device", name: "upload" },
        {
          icon: "content-add",
          title: "Create empty content",
          name: "content-add",
        },
        {
          icon: "youtube",
          title: "YouTube",
          name: "youtube",
        },
      ];

      if (this.showGDrive) {
        actions.push({
          icon: "gdrive",
          title: "Google Drive",
          name: "gdrive",
        });
      }

      addOverflowMenu = html`<bb-overflow-menu
        .actions=${actions}
        .disabled=${false}
        style=${styleMap({
          left: `${this.#addOverflowLocation.x}px`,
          top: `${this.#addOverflowLocation.y}px`,
        })}
        @pointerdown=${(evt: PointerEvent) => {
          evt.stopImmediatePropagation();
        }}
        @bboverflowmenuaction=${async (evt: OverflowMenuActionEvent) => {
          evt.stopImmediatePropagation();

          switch (evt.action) {
            case "upload": {
              this.#attemptUploadAsset();
              break;
            }

            case "content-add": {
              await this.#attemptCreateEmptyContentAsset();
              break;
            }

            case "gdrive": {
              await this.#attemptGDrivePickerFlow();
              break;
            }

            case "youtube": {
              await this.#attemptCreateFileDataAsset(
                "video/mp4",
                "YouTube Video",
                "",
                "youtube"
              );
              break;
            }
          }

          this.showAddOverflowMenu = false;
        }}
        @bboverflowmenudismissed=${() => {
          this.showAddOverflowMenu = false;
        }}
      ></bb-overflow-menu>`;
    }

    return html` <div
        id="background"
        @pointerdown=${() => {
          this.dispatchEvent(new OverlayDismissedEvent());
        }}
      >
        <div
          id="container"
          @pointerdown=${(evt: PointerEvent) => {
            evt.stopImmediatePropagation();

            this.showAddOverflowMenu = false;
          }}
        >
          <header>
            <h1>${Strings.from("LABEL_TITLE")}</h1>
          </header>
          <section id="assets">
            <section>
              <div id="add-asset-container">
                <button
                  id="add-asset"
                  @click=${(evt: PointerEvent) => {
                    this.showAddOverflowMenu = true;

                    if (!(evt.target instanceof HTMLButtonElement)) {
                      return;
                    }

                    const bounds = evt.target.getBoundingClientRect();
                    this.#addOverflowLocation = {
                      x: bounds.left,
                      y: bounds.bottom + OVERFLOW_MENU_PADDING,
                    };
                  }}
                >
                  ${Strings.from("COMMAND_ADD_ASSET")}
                </button>
              </div>
              ${assets && assets.size > 0
                ? html`<menu>
                    ${repeat(assets, ([path, asset]) => {
                      if (path === "@@splash") {
                        return nothing;
                      }

                      return html`<li>
                        ${asset === this.editAssetTitle
                          ? html`<span
                                class=${classMap({
                                  [asset.metadata?.type ?? "generic"]: true,
                                  [asset.metadata?.subType ?? "sub-generic"]:
                                    true,
                                })}
                              ></span>

                              <input
                                type="text"
                                required
                                autofocus
                                .value=${asset.metadata?.title || path}
                                ${ref(this.#renameInputRef)}
                                @blur=${(evt: Event) => {
                                  if (
                                    !(evt.target instanceof HTMLInputElement)
                                  ) {
                                    return;
                                  }

                                  if (!this.editAssetTitle) {
                                    return;
                                  }

                                  if (!evt.target.value) {
                                    evt.target.reportValidity();
                                    return;
                                  }

                                  this.#attemptUpdateAssetTitle(
                                    this.editAssetTitle,
                                    evt.target.value
                                  );
                                  this.#showAsset(this.editAssetTitle);
                                  this.editAssetTitle = null;
                                }}
                                @keydown=${(evt: KeyboardEvent) => {
                                  if (
                                    !(evt.target instanceof HTMLInputElement)
                                  ) {
                                    return;
                                  }

                                  if (evt.key !== "Enter") {
                                    return;
                                  }

                                  if (!this.editAssetTitle) {
                                    return;
                                  }

                                  if (!evt.target.value) {
                                    evt.target.reportValidity();
                                    return;
                                  }

                                  this.#attemptUpdateAssetTitle(
                                    this.editAssetTitle,
                                    evt.target.value
                                  );
                                  this.#showAsset(this.editAssetTitle);
                                  this.editAssetTitle = null;
                                }}
                              />`
                          : html`<button
                              class=${classMap({
                                asset: true,
                                [asset.metadata?.type ?? "generic"]: true,
                                [asset.metadata?.subType ?? "sub-generic"]:
                                  true,
                                active: asset.path === this.asset?.path,
                              })}
                              @click=${() => {
                                if (asset !== this.asset) {
                                  this.#showAsset(asset);
                                } else {
                                  this.editAssetTitle = asset;
                                }
                              }}
                              @dblclick=${() => {
                                this.editAssetTitle = asset;
                              }}
                            >
                              ${asset.metadata?.title || path}
                            </button>`}

                        <button
                          class=${classMap({
                            delete: true,
                          })}
                          @click=${async () => {
                            if (this.#deleting) {
                              return;
                            }

                            await this.#deleteAsset(path);
                          }}
                        >
                          Delete
                        </button>
                      </li>`;
                    })}
                  </menu>`
                : html`<div id="no-assets">
                    ${Strings.from("LABEL_NO_ASSETS")}
                  </div>`}
            </section>

            <section
              id="details"
              class=${classMap({
                padded: this.asset?.metadata?.type === "file",
              })}
            >
              ${assetData
                ? html`
                    ${this.asset?.metadata?.type === "content"
                      ? html`<div>
                          <button
                            id="edit-asset"
                            class=${classMap({
                              save: this.editAssetContent !== null,
                            })}
                            @click=${() => {
                              if (!this.asset) {
                                return;
                              }

                              if (!this.editAssetContent) {
                                this.editAssetContent = this.asset;
                                return;
                              }

                              if (!this.#contentInputRef.value) {
                                console.warn("No LLM Content editor");
                                return;
                              }

                              this.#attemptUpdateAsset();
                            }}
                          >
                            ${this.editAssetContent
                              ? Strings.from("COMMAND_SAVE_ASSET")
                              : Strings.from("COMMAND_EDIT_ASSET")}
                          </button>
                        </div>`
                      : nothing}
                    ${this.editAssetContent
                      ? html`<bb-llm-input
                          ${ref(this.#contentInputRef)}
                          @keydown=${(evt: KeyboardEvent) => {
                            const isMac =
                              navigator.platform.indexOf("Mac") === 0;
                            const isCtrlCommand = isMac
                              ? evt.metaKey
                              : evt.ctrlKey;

                            if (evt.key === "Enter" && isCtrlCommand) {
                              this.#attemptUpdateAsset();
                            }
                          }}
                          .value=${assetData}
                          .clamped=${false}
                          .description=${null}
                          .showInlineControlsToggle=${hasEditableParts}
                          .showInlineControls=${hasEditableParts}
                          .showPartControls=${hasEditableParts}
                          .autofocus=${true}
                        ></bb-llm-input>`
                      : html`<bb-llm-output
                          .value=${assetData}
                          .clamped=${false}
                          .graphUrl=${this.state?.graphUrl || null}
                          .showExportControls=${true}
                          .supportedExportControls=${supportedExportControls}
                        ></bb-llm-output>`}
                  `
                : html`<div id="no-asset-selected">No asset selected</div>`}
            </section>
          </section>
        </div>

        <div>
          <bb-google-drive-file-id
            id="add-drive-proxy"
            ${ref(this.#addDriveInputRef)}
            .connectionName=${SIGN_IN_CONNECTION_ID}
            @bb-input-change=${(evt: InputChangeEvent) => {
              const driveFile = evt.value as {
                preview: string;
                id: string;
                mimeType: string;
              };

              this.#attemptCreateFileDataAsset(
                driveFile.mimeType,
                driveFile.preview,
                driveFile.id,
                "gdrive"
              );
            }}
          ></bb-google-drive-file-id>
        </div>
      </div>

      <input
        type="file"
        id="add-asset-proxy"
        multiple
        ${ref(this.#uploadInputRef)}
        @change=${(evt: InputEvent) => {
          if (!(evt.target instanceof HTMLInputElement) || !evt.target.files) {
            return;
          }

          const target = evt.target;
          const assetLoad = [...evt.target.files].map((file) => {
            return new Promise<{
              name: string;
              type: string;
              content: string | null;
            }>((resolve) => {
              const reader = new FileReader();
              reader.addEventListener("loadend", () => {
                resolve({
                  name: file.name,
                  type: file.type,
                  content: reader.result as string | null,
                });
              });
              reader.readAsDataURL(file);
            });
          });

          Promise.all(assetLoad).then((assets) => {
            // Reset the input otherwise we aren't guaranteed to get the
            // input event if the same files are uploaded.
            target.value = "";

            if (!this.state) {
              return;
            }

            for (const asset of assets) {
              if (!asset.content) continue;
              const [, mimeType, , data] = asset.content.split(/[:;,]/);
              this.state.addGraphAsset({
                path: asset.name,
                metadata: {
                  title: asset.name,
                  type: "file",
                },
                data: [
                  {
                    parts: [
                      {
                        inlineData: { mimeType, data },
                      },
                    ],
                    role: "user",
                  },
                ],
              });
            }
          });
        }}
      />
      ${addOverflowMenu}`;
  }
}
