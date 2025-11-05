export class RationaleCache {
  private cache = new Map<string, string>();

  private getKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  }

  get(lat: number, lng: number): string | undefined {
    return this.cache.get(this.getKey(lat, lng));
  }

  set(lat: number, lng: number, rationale: string): void {
    this.cache.set(this.getKey(lat, lng), rationale);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
