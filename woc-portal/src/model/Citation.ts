    class Citation{
        constructor(
            public source_id: number,
            public use: string,
            public reference: string,
            public url?: string,
            public doi?: string,

            public page?: number|undefined,
            public link?: string|undefined,
            public fulltext?: string|undefined,
        ){}

    }

    export default Citation;