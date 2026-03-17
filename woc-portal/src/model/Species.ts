export class SpeciesSnapshot {
  constructor(
    public snapshot_id: number,
    public snapshot_name: string,
    public snapshot_date?: string,
    public indigenous_aoo?: number,
    public non_indigenous_aoo?: number,
  ) {}
}

class Species {
  constructor(
    public id: number,
    public species_name: string,
    public official_id: number,
    public snapshots: SpeciesSnapshot[] = [],
  ) {}
}

export default Species;
