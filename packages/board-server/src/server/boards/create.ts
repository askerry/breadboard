/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response } from "express";

import type { BoardServerStore } from "../types.js";
import { getBody } from "../common.js";
import { asPath } from "../store.js";

export type CreateRequest = {
  name: string;
};

async function create(req: Request, res: Response): Promise<void> {
  let store: BoardServerStore = req.app.locals.store;
  let userId: string = res.locals.userId;

  const request = (await getBody(req)) as CreateRequest;
  const name = request.name;
  if (!name) {
    res.sendStatus(400);
    return;
  }

  // If a board by this name already exists, return 400
  if (await store.loadBoard(userId, name)) {
    res.sendStatus(400);
    return;
  }

  await store.create(userId, name);
  res.json({ path: asPath(userId, name) });
}

export default create;
