import { Button } from "../../src/ui/button.js";
import { GateBlock } from "../../src/ui/gate-block.js";

export default { title: "Workflow / Gate block" };

export const Choice = () => (
  <GateBlock
    gate={{ kind: "choice", title: "Send the renewal offer?", prompt: "The customer's plan expires in 3 days." }}
    footer={
      <>
        <Button size="sm">Send it</Button>
        <Button size="sm" variant="outline">
          Hold off
        </Button>
      </>
    }
  />
);

export const ReviewList = () => (
  <GateBlock gate={{ kind: "reviewList", title: "Review the flagged invoices" }}>
    <ul className="flex flex-col gap-1 text-sm">
      <li>Acme Robotics — $4,200, 62 days overdue</li>
      <li>Blue Harbor Logistics — $1,180, 40 days overdue</li>
    </ul>
  </GateBlock>
);

export const Form = () => (
  <GateBlock gate={{ kind: "form", title: "Confirm the shipping address", prompt: "We could not verify this address automatically." }} />
);
