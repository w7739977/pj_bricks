export function installGameTextGuard(surface) {
  // Cancel selection/context/native drag without cancelling touch or click events.
  for (const type of ['selectstart', 'contextmenu', 'dragstart']) {
    surface.addEventListener(type, event => {
      if (event.cancelable) event.preventDefault();
    });
  }
}
