import { rmSync } from "node:fs";

import { host } from "./helpers";

export default function globalTeardown(): void {
  rmSync(host, { recursive: true, force: true });
}
