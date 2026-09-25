import "@corbits/react-ui/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { scenarios } from "./scenarios.js";

const name = window.location.pathname.slice(1);
const Scenario = scenarios[name];

createRoot(document.getElementById("root")!).render(
  <StrictMode>{Scenario ? <Scenario /> : <p>Unknown scenario: {name}</p>}</StrictMode>,
);
