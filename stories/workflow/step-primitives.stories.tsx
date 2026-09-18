import { Step, StepDescription, StepIndicator, StepLabel, Steps, StepTitle } from "../../src/ui/step-primitives.js";

export default { title: "Workflow / Step primitives" };

export const Horizontal = () => (
  <Steps orientation="horizontal">
    <StepIndicator status="complete" index={0} />
    <StepIndicator status="active" index={1} />
    <StepIndicator status="incomplete" index={2} />
  </Steps>
);

// The compound API's intended use: a caller wires status into each
// `StepIndicator` itself, one `Step` row per entry.
export const Vertical = () => (
  <Steps orientation="vertical">
    <Step>
      <StepIndicator status="complete" index={0} />
      <StepLabel>
        <StepTitle>Collect requirements</StepTitle>
        <StepDescription>Reviewed with the customer on Tuesday.</StepDescription>
      </StepLabel>
    </Step>
    <Step>
      <StepIndicator status="active" index={1} />
      <StepLabel>
        <StepTitle>Draft the proposal</StepTitle>
        <StepDescription>In progress.</StepDescription>
      </StepLabel>
    </Step>
    <Step>
      <StepIndicator status="incomplete" index={2} />
      <StepLabel>
        <StepTitle>Send for signature</StepTitle>
      </StepLabel>
    </Step>
  </Steps>
);
