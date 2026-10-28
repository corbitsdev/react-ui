/**
 * Makes every sibling of `element` inert, so nothing beside it can take
 * focus or be reached by assistive technology. A sibling that was already
 * inert is left alone. The returned function lifts only the inertness this
 * call added.
 */
export function inertSiblings(element: Element): () => void {
  const added: Element[] = [];
  for (const sibling of element.parentElement?.children ?? []) {
    if (sibling === element || sibling.hasAttribute("inert")) continue;
    sibling.setAttribute("inert", "");
    added.push(sibling);
  }
  return () => {
    for (const sibling of added) sibling.removeAttribute("inert");
  };
}
