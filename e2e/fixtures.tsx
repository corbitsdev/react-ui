import type { ReactNode } from "react";

import { Button } from "@corbits/react-ui";

export const scenarios: Record<string, () => ReactNode> = {
  smoke: () => <Button>Ready</Button>,
};
