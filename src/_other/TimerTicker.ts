export class TimerTicker {
  listeners = [] as any[];
  intervalId = setInterval(() => this.emit(), this.interval);

  constructor(public interval: number) {}

  emit() {
    this.listeners.forEach(l => l());
  }

  onTick(fn: Function) {
    this.listeners.push(fn);
  }

  finished() {
    this.emit();
    clearInterval(this.intervalId);
  }
}
