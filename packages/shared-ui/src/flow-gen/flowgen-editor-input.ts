/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, html, css, type PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import * as StringsHelper from "../strings/helper.js";
import { createRef, ref } from "lit/directives/ref.js";
import type { GraphDescriptor } from "@breadboard-ai/types";
import { consume } from "@lit/context";
import { GraphReplaceEvent, UtteranceEvent } from "../events/events.js";
import type { ExpandingTextarea } from "../elements/input/expanding-textarea.js";
import { icons } from "../styles/icons.js";
import "../elements/input/expanding-textarea.js";
import { type FlowGenerator, flowGeneratorContext } from "./flow-generator.js";
import { classMap } from "lit/directives/class-map.js";
import { spinAnimationStyles } from "../styles/spin-animation.js";
import { ActionTracker } from "../utils/action-tracker.js";
import { colorsLight } from "../styles/host/colors-light.js";
import { type } from "../styles/host/type.js";

const Strings = StringsHelper.forSection("Editor");

type State =
  | { status: "initial" }
  | { status: "generating" }
  | { status: "error"; error: unknown };

@customElement("bb-flowgen-editor-input")
export class FlowgenEditorInput extends LitElement {
  static styles = [
    icons,
    colorsLight,
    type,
    spinAnimationStyles,
    css`
      * {
        box-sizing: border-box;
      }

      :host {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        max-width: 500px;
        margin: 0 var(--bb-grid-size-2);

        --placeholder-color: var(--n-70);
      }

      #dismiss-button {
        background: none;
        border: none;
        color: var(--bb-neutral-200);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: var(--bb-grid-size-5);
      }

      .dismiss-button:hover {
        color: var(--bb-neutral-400);
      }

      p {
        word-break: break-all;
      }

      #feedback {
        font: 400 var(--bb-title-small) / var(--bb-title-line-height-small)
          var(--bb-font-family);
        color: var(--bb-neutral-200);
        transition: var(--color-transition);
        background: var(--bb-neutral-800);
        border-radius: var(--bb-grid-size-2);
        padding-left: var(--bb-grid-size-5);
        padding-right: var(--bb-grid-size-5);
        word-break: break-all;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--bb-grid-size-4);
      }

      #gradient-border-container {
        flex: 1;
        display: flex;
        align-items: center;
        width: 100%;
        background: var(--ui-custom-o-10);
        border-radius: var(--bb-grid-size-16);
        padding: 12px;
      }

      bb-speech-to-text {
        --button-size: var(--bb-grid-size-8);
        --alpha-adjustment: 0;
        --background-color: transparent;
        --active-color: linear-gradient(
          rgb(177, 207, 250) 0%,
          rgb(198, 210, 243) 34%,
          rgba(210, 212, 237, 0.4) 69%,
          rgba(230, 217, 231, 0) 99%
        );
        margin: 0 var(--bb-grid-size-2);
      }

      bb-expanding-textarea {
        flex: 1;
        width: 100%;
        color: var(--n-0);
        transition: var(--color-transition);
        background: var(--n-100);
        border: none;
        border-radius: var(--bb-grid-size-16);
        padding: var(--bb-grid-size-2) var(--bb-grid-size-4);
        --min-lines: 1;
        --max-lines: 4;
        font: 400 var(--bb-title-small) / var(--bb-title-line-height-small)
          var(--bb-font-family);
        line-height: 1lh;
        caret-color: var(--n-0);

        > [slot~="submit"] {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          color: var(--n-70);
          font-size: 30px;
          width: 30px;
          height: 30px;
        }

        &::part(textarea)::placeholder {
          color: var(--placeholder-color);
          transition: var(--color-transition);
        }
      }
    `,
  ];

  @consume({ context: flowGeneratorContext })
  accessor flowGenerator: FlowGenerator | undefined;

  @property({ type: Object })
  accessor currentGraph: GraphDescriptor | undefined;

  @state()
  accessor #state: State = { status: "initial" };

  @property({ type: Boolean, reflect: true })
  accessor focused = false;

  @property({ type: Boolean, reflect: true })
  accessor generating = false;

  @property({ reflect: true, type: Boolean })
  accessor highlighted = false;

  readonly #descriptionInput = createRef<ExpandingTextarea>();

  override render() {
    const feedback = html` <div id="feedback">
      <p>${this.#renderFeedback()}</p>
      <button id="dismiss-button" @click=${this.#onClearError}>&#215</button>
    </div>`;
    return [
      this.#renderFeedback() == nothing ? nothing : feedback,
      this.#renderInput(),
    ];
  }

  override async updated(changes: PropertyValues) {
    if (changes.has("#state") && this.#state.status === "error") {
      this.#descriptionInput.value?.focus();
      this.highlighted = true;
      setTimeout(() => (this.highlighted = false), 2500);
    }
  }

  #renderFeedback() {
    switch (this.#state.status) {
      case "initial":
      case "generating": {
        return nothing;
      }
      case "error": {
        let error = this.#state.error as
          | string
          | { message?: string }
          | { error: { message?: string } | string };
        if (typeof error === "object" && error !== null && "error" in error) {
          // Errors from Breadboard are often wrapped in an {error: <Error>}
          // structure. Unwrap if needed.
          error = error.error;
        }
        let message;
        if (typeof error === "object" && error !== null && "message" in error) {
          message = error.message;
        } else {
          message = String(error);
        }
        return html`<span class="error">${message}</span>`;
      }
      default: {
        this.#state satisfies never;
      }
    }
  }

  #renderInput() {
    const isGenerating = this.#state.status === "generating";
    return html`
      <div id="gradient-border-container">
        <bb-expanding-textarea
          ${ref(this.#descriptionInput)}
          .disabled=${isGenerating}
          .placeholder=${Strings.from("COMMAND_DESCRIBE_EDIT_FLOW")}
          @change=${this.#onInputChange}
          @focus=${this.#onInputFocus}
          @blur=${this.#onInputBlur}
        >
          <bb-speech-to-text
            slot="mic"
            @bbutterance=${(evt: UtteranceEvent) => {
              if (!this.#descriptionInput.value) {
                return;
              }

              this.#descriptionInput.value.value = evt.parts
                .map((part) => part.transcript)
                .join("");
            }}
          ></bb-speech-to-text>
          <span
            slot="submit"
            class=${classMap({
              "g-icon": true,
              filled: true,
              round: true,
              spin: isGenerating,
            })}
            >${isGenerating ? "progress_activity" : "send"}</span
          >
        </bb-expanding-textarea>
      </div>
    `;
  }

  #onInputChange() {
    const input = this.#descriptionInput.value;
    const description = input?.value;
    if (description) {
      if (description === "/force generating") {
        this.#state = { status: "generating" };
        return;
      } else if (description === "/force initial") {
        this.#state = { status: "initial" };
        return;
      }
      this.#state = { status: "generating" };

      ActionTracker.flowGenEdit(this.currentGraph?.url);

      void this.#generateBoard(description)
        .then((graph) => this.#onGenerateComplete(graph))
        .catch((error) => this.#onGenerateError(error));
    }
  }

  #onClearError() {
    this.#state = { status: "initial" };
  }

  async #generateBoard(intent: string): Promise<GraphDescriptor> {
    if (!this.flowGenerator) {
      throw new Error(`No FlowGenerator was provided`);
    }
    this.generating = true;
    const { flow } = await this.flowGenerator.oneShot({
      intent,
      context: { flow: this.currentGraph },
    });
    return flow;
  }

  #onGenerateComplete(graph: GraphDescriptor) {
    if (this.#state.status !== "generating") {
      return;
    }
    this.dispatchEvent(new GraphReplaceEvent(graph, { role: "assistant" }));
    this.#state = { status: "initial" };
    this.#clearInput();
    this.generating = false;
  }

  #onGenerateError(error: unknown) {
    if (this.#state.status !== "generating") {
      return;
    }
    console.error("Error generating board", error);
    this.#state = { status: "error", error };
    this.generating = false;
  }

  #clearInput() {
    if (this.#descriptionInput.value) {
      this.#descriptionInput.value.value = "";
    }
  }

  #onInputFocus() {
    this.focused = true;
  }

  #onInputBlur() {
    this.focused = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bb-flowgen-editor-input": FlowgenEditorInput;
  }
}
