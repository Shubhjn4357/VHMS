import { nanoid } from "nanoid";

export const makeId = (prefix: string) => `${prefix}_${nanoid(12)}`;
