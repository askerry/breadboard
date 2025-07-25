/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createRunObserver,
  GraphLoader,
  InputValues,
  InspectableRunObserver,
  InspectableRunSequenceEntry,
  invokeGraph,
  Kit,
  MainGraphIdentifier,
  MutableGraphStore,
  NodeConfiguration,
  OutputValues,
  RunArguments,
  RunStore,
} from "@google-labs/breadboard";
import { Result, Tab, TabId } from "./types";
import * as BreadboardUI from "@breadboard-ai/shared-ui";
import {
  createRunner,
  HarnessRunner,
  RunConfig,
  RunEndEvent,
  RunErrorEvent,
  RunGraphEndEvent,
  RunGraphStartEvent,
  RunInputEvent,
  RunLifecycleEvent,
  RunNextEvent,
  RunNodeEndEvent,
  RunNodeStartEvent,
  RunOutputEvent,
  RunSecretEvent,
  RunSkipEvent,
} from "@google-labs/breadboard/harness";
import { RuntimeBoardRunEvent } from "./events";
import { sandbox } from "../sandbox";
import { BoardServerAwareDataStore } from "@breadboard-ai/board-server-management";
import { StateManager } from "./state";

export class Run extends EventTarget {
  #runs = new Map<
    TabId,
    {
      mainGraphId: MainGraphIdentifier;
      harnessRunner?: HarnessRunner;
      topGraphObserver?: BreadboardUI.Utils.TopGraphObserver;
      runObserver?: InspectableRunObserver;
      abortController?: AbortController;
      kits: Kit[];
    }
  >();

  constructor(
    public readonly graphStore: MutableGraphStore,
    public readonly dataStore: BoardServerAwareDataStore,
    public readonly runStore: RunStore,
    public readonly state: StateManager
  ) {
    super();
  }

  create(
    tab: Tab,
    topGraphObserver: BreadboardUI.Utils.TopGraphObserver,
    runObserver?: InspectableRunObserver
  ) {
    this.#runs.set(tab.id, {
      mainGraphId: tab.mainGraphId,
      topGraphObserver,
      runObserver,
      kits: [...this.graphStore.kits, ...tab.boardServerKits],
    });
  }

  async clearLastRun(tabId: TabId | null, urlToClear: string | undefined) {
    if (!tabId || !urlToClear) {
      return;
    }

    const run = this.#runs.get(tabId);
    if (run) {
      const project = this.state.getOrCreate(run.mainGraphId);
      if (project) {
        project.resetRun();
      }
    } else {
      console.warn(
        `Failed to clear console: unable to find ran with Tab Id "${tabId}"`
      );
    }

    this.#runs.delete(tabId);

    return this.runStore.truncate(urlToClear, 1);
  }

  getRunner(tabId: TabId | null) {
    if (!tabId) {
      return null;
    }

    const run = this.#runs.get(tabId);
    if (!run) {
      return null;
    }

    return run.harnessRunner ?? null;
  }

  getAbortSignal(tabId: TabId | null) {
    if (!tabId) {
      return null;
    }

    const run = this.#runs.get(tabId);
    if (!run) {
      return null;
    }

    return run.abortController ?? null;
  }

  getObservers(tabId: TabId | null) {
    if (!tabId) {
      return null;
    }

    const run = this.#runs.get(tabId);
    if (!run) {
      return null;
    }

    const { topGraphObserver, runObserver } = run;
    return { topGraphObserver, runObserver };
  }

  async runBoard(
    tab: Tab,
    config: RunConfig,
    history?: InspectableRunSequenceEntry[]
  ) {
    const abortController = new AbortController();
    const tabId = tab.id;
    config = {
      ...config,
      store: this.dataStore.createRunDataStore(config.url),
      kits: [...this.graphStore.kits, ...tab.boardServerKits],
      signal: abortController.signal,
      graphStore: this.graphStore,
    };

    const runner = this.#createBoardRunner(
      tab.mainGraphId,
      config,
      abortController
    );
    this.#runs.set(tabId, runner);

    const { harnessRunner, runObserver, topGraphObserver } = runner;
    harnessRunner.addEventListener("start", (evt: RunLifecycleEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("pause", (evt: RunLifecycleEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("resume", (evt: RunLifecycleEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("next", (evt: RunNextEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("input", (evt: RunInputEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("output", (evt: RunOutputEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("secret", (evt: RunSecretEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("error", (evt: RunErrorEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("skip", (evt: RunSkipEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("graphstart", (evt: RunGraphStartEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("graphend", (evt: RunGraphEndEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("nodestart", (evt: RunNodeStartEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("nodeend", (evt: RunNodeEndEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    harnessRunner.addEventListener("end", (evt: RunEndEvent) => {
      this.dispatchEvent(
        new RuntimeBoardRunEvent(tabId, evt, harnessRunner, abortController)
      );
    });

    // This incantation connects harnessRunner to the project, populating
    // `Project.run`.
    const project = this.state.getOrCreate(tab.mainGraphId);
    if (!project) {
      console.warn(`Unable to get project for graph: ${tab.mainGraphId}`);
    } else {
      project.connectHarnessRunner(
        harnessRunner,
        config.fileSystem!,
        abortController.signal
      );
    }

    if (history) {
      await runObserver.append(history);
      topGraphObserver.startWith(history);
    }
    harnessRunner.run();
  }

  #createBoardRunner(
    mainGraphId: MainGraphIdentifier,
    config: RunConfig,
    abortController: AbortController
  ) {
    const harnessRunner = createRunner(config);
    const runObserver = createRunObserver(this.graphStore, {
      logLevel: "debug",
      dataStore: this.dataStore,
      runStore: this.runStore,
      kits: config.kits,
      sandbox: sandbox,
    });

    const topGraphObserver = new BreadboardUI.Utils.TopGraphObserver(
      harnessRunner,
      config.signal,
      runObserver
    );

    harnessRunner.addObserver(runObserver);

    return {
      mainGraphId,
      harnessRunner,
      topGraphObserver,
      runObserver,
      abortController,
      kits: config.kits,
    };
  }

  async invokeSideboard(
    kits: Kit[],
    url: string,
    loader: GraphLoader,
    inputs: InputValues,
    settings: BreadboardUI.Types.SettingsStore | null
  ): Promise<Result<OutputValues>> {
    const loadResult = await loader.load(url, {
      base: new URL(window.location.href),
    });
    if (!loadResult.success) {
      return loadResult;
    }
    const args: RunArguments = {
      kits: [sideboardSecretsKit(settings), ...kits],
      loader: loader,
      store: this.dataStore,
    };
    const result = await invokeGraph(loadResult, inputs, args);
    return { success: true, result: result.config as NodeConfiguration };
  }
}

function sideboardSecretsKit(
  settings: BreadboardUI.Types.SettingsStore | null
): Kit {
  // TODO: Make this not a total hack like this.
  const GEMINI_KEY = settings
    ?.getSection(BreadboardUI.Types.SETTINGS_TYPE.SECRETS)
    .items.get("GEMINI_KEY")?.value;
  return {
    url: import.meta.url,
    handlers: {
      secrets: async (inputs) => {
        const keys = (inputs.keys || []) as string[];
        if (keys.length === 1 && keys[0] === "GEMINI_KEY") {
          return { GEMINI_KEY };
        }
        throw new Error(`Unknown keys: ${keys.join(", ")}`);
      },
    },
  };
}
