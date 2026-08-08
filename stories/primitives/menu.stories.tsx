import { Button } from "../../src/ui/button.js";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "../../src/ui/menu.js";

export default { title: "Primitives / Menu" };

export const Toolbar = () => (
  <Menu>
    <MenuTrigger asChild>
      <Button variant="outline" size="sm">
        Actions
      </Button>
    </MenuTrigger>
    <MenuContent align="start">
      <MenuLabel>This run</MenuLabel>
      <MenuItem>Duplicate</MenuItem>
      <MenuItem>Export as CSV</MenuItem>
      <MenuSeparator />
      <MenuItem disabled>Archive</MenuItem>
    </MenuContent>
  </Menu>
);
