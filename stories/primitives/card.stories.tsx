import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../../src/ui/card.js";
import { Button } from "../../src/ui/button.js";

export default { title: "Primitives / Card" };

export const Basic = () => (
  <Card className="max-w-sm">
    <CardHeader>
      <CardTitle>Deploy schedule</CardTitle>
      <CardDescription>Runs every weekday at 9:00 AM.</CardDescription>
    </CardHeader>
    <p className="text-sm text-muted-foreground">Next run in 4 hours. Last run succeeded.</p>
    <CardFooter>
      <Button variant="outline" size="sm">
        Edit
      </Button>
      <Button size="sm">Run now</Button>
    </CardFooter>
  </Card>
);
