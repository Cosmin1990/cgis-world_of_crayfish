class Record {
    constructor(
        public id: number,
        public woc_id: string,
        // Navy blue columns
        public doi?: string,
        public url?: string,
        public citation?: string,
        // Orange columns
        public coord_x?: number,
        public coord_y?: number,
        public accuracy: 'High' | 'Medium' | 'Low' = 'High',
        // Green columns
        public crayfish_scientific_name?: string,
        public status?: string,
        public year_of_record?: number,
        public ncbi_coi_accession_code?: string,
        public ncbi_16s_accession_code?: string,
        public ncbi_sra_accession_code?: string,
        public claim_extinction?: string,
        // Red columns
        public pathogen_symbiont_scientific_name?: string,
        public pathogen_ncbi_coi_accession_code?: string,
        public pathogen_ncbi_16s_accession_code?: string,
        public pathogen_genotype_group?: string,
        public pathogen_haplotype?: string,
        public pathogen_year_of_record?: number,
        // Blue columns
        public comments?: string,
        public confidentialiaty_level: '0' | '1' = '0',
        public contributor?: string,
    ) {}
}

export default Record;