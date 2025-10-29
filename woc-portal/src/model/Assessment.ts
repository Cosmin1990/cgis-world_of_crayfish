                // "scientific_name": data.get("taxon", {}).get("scientific_name"),
                // "assessment_id": latest_assessment.get("assessment_id"),
                // "danger_level": latest_assessment.get("red_list_category_code"),
                // "year_published": latest_assessment.get("year_published"),
                // "url": latest_assessment.get("url")

class Assessment{
    constructor(
        public scientific_name: string,
        public assessment_id: number,
        public danger_level: string,
        public year_published: string,
        public url: string,
    ){}

}

export default Assessment;