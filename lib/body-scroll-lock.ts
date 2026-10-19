type BodyScrollLockKind = "sheet-open" | "coach-open";

const activeLocks = new Set<BodyScrollLockKind>();
let savedScrollY = 0;

/** Lock body scroll while a sheet/modal is open; restores scroll position on release. */
export function acquireBodyScrollLock(kind: BodyScrollLockKind): () => void {
  if (activeLocks.size === 0) {
    savedScrollY = window.scrollY;
    document.body.style.top = `-${savedScrollY}px`;
  }
  activeLocks.add(kind);
  document.body.classList.add(kind);

  return () => {
    activeLocks.delete(kind);
    document.body.classList.remove(kind);
    if (activeLocks.size === 0) {
      document.body.style.top = "";
      window.scrollTo(0, savedScrollY);
    }
  };
}
