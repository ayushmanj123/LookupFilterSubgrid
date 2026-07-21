export class EmptyState {
  private el: HTMLDivElement;

  constructor(private readonly container: HTMLDivElement) {
    this.el = document.createElement("div");
    this.el.className = "lfs-empty-state";
    this.el.hidden = true;
    this.container.appendChild(this.el);
  }

  public show(message: string): void {
    this.el.hidden = false;
    this.el.textContent = message;
  }

  public hide(): void {
    this.el.hidden = true;
    this.el.textContent = "";
  }

  public destroy(): void {
    this.el.remove();
  }
}
