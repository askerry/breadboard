/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Presentation } from "../types/particles.js";
import { TodoItems, TodoList } from "../types/types.js";
import { SignalMap } from "signal-utils/map";

export { List };

class List implements TodoList {
  items: TodoItems = new SignalMap();
  presentation: Presentation = {
    type: "list",
    orientation: "vertical",
    behaviors: [],
  };
}
