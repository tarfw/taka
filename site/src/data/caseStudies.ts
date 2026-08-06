export interface CaseStudyStat {
  value: string;
  label: string;
}

export interface CaseStudy {
  slug: string;
  organization: string;
  sector: string;
  emirate: string;
  timeframe: string;
  headline: string;
  summary: string;
  quote: string;
  author: string;
  role: string;
  stats: CaseStudyStat[];
  deliverables: string[];
  challenge: string;
  solution: string;
  results: string[];
  image: string;
  imageAlt: string;
  credit?: string;
  creditUrl?: string;
  featured?: boolean;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'abu-dhabi-education-council',
    organization: 'Abu Dhabi Education Council',
    sector: 'Education & Schools',
    emirate: 'Abu Dhabi',
    timeframe: '2023 - 2024',
    headline: 'Laboratory workstations for school science labs',
    summary:
      'Supply and installation of laboratory workstations, fume hoods and seating for school science laboratories across Abu Dhabi, delivered before the academic year began.',
    quote:
      'TAKA delivered and installed laboratory workstations across multiple schools. Professional service from start to finish.',
    author: 'Ahmed Al Mansouri',
    role: 'Facilities Director',
    stats: [
      { value: '14', label: 'school labs equipped' },
      { value: '350+', label: 'workstations installed' },
      { value: '6 weeks', label: 'from order to handover' },
    ],
    deliverables: [
      'Laboratory workstations with chemical-resistant tops',
      'Ducted and ductless fume hoods, EN 14175 certified',
      'Adjustable student lab desks and seating',
      'Safety cabinets, eye-wash stations and first-aid points',
    ],
    challenge:
      'ADEC needed a standardised fit-out for school science laboratories across multiple campuses. Work had to be completed inside the summer break so classrooms were ready for the new academic year, with no room for slippage.',
    solution:
      'We supplied a single modular workstation system and fume hood range, so every lab followed the same layout, specification and spares list. Deliveries were staged by campus and our own installation crew handled the fit-out, including utility connections where required.',
    results: [
      'All 14 laboratories handed over on schedule before term started',
      'One standard specification across campuses, simplifying maintenance',
      'No campus had to suspend existing activities during installation',
    ],
    image: '/case-studies/adec-school-lab.jpg',
    imageAlt: 'Young student in a lab coat and safety goggles at a school science workstation',
    featured: true,
  },
  {
    slug: 'sheikh-khalifa-medical-city',
    organization: 'Sheikh Khalifa Medical City',
    sector: 'Healthcare & Hospitals',
    emirate: 'Abu Dhabi',
    timeframe: 'Ongoing',
    headline: 'Medical furniture for a full hospital campus',
    summary:
      'Ongoing supply of hospital beds, medical carts and sterile storage across a multi-building hospital campus, delivered around an operating schedule.',
    quote:
      'Delivery windows that work around a busy hospital. Our wards were never disrupted.',
    author: 'Sarah Al Hashimi',
    role: 'Procurement Manager',
    stats: [
      { value: '25+', label: 'projects completed' },
      { value: '10+', label: 'institutions served' },
      { value: '7-day', label: 'typical delivery lead' },
    ],
    deliverables: [
      'Electric and manual hospital beds with side rails',
      'Crash carts, procedure carts and IV poles in stainless steel',
      'Sterile storage and laminar-flow cabinets',
      'Examination tables and clinic seating',
    ],
    challenge:
      'A hospital operates around the clock. Furniture and equipment had to be delivered, installed and commissioned without blocking corridors, closing wards or interrupting patient care.',
    solution:
      'We agreed delivery windows with each ward, prioritising night and low-traffic periods. Every product was supplied with infection-control-safe finishes and full documentation, and our crews handled installation to a written site checklist.',
    results: [
      'Zero disruption to ward operations during installations',
      'Repeat orders across multiple departments and buildings',
      'A single point of contact for the whole campus',
    ],
    image: '/case-studies/skmc-opd.jpg',
    imageAlt: 'Outpatient department of Sheikh Khalifa Medical City',
    credit: 'Photo: Skeenagraphics / Alan G D Hoffman',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:SKMC_OPD.jpg',
  },
  {
    slug: 'khalifa-university',
    organization: 'Khalifa University',
    sector: 'Research Laboratories',
    emirate: 'Abu Dhabi',
    timeframe: '2023 - 2025',
    headline: 'Scientific apparatus for research laboratories',
    summary:
      'Supply, calibration and installation of analytical instruments, ESD workbenches and fume extraction for university research laboratories.',
    quote:
      'Equipping research labs with modern scientific apparatus — delivered with the documentation we needed.',
    author: 'Dr. Omar Al Suwaidi',
    role: 'Laboratory Director',
    stats: [
      { value: '40+', label: 'labs outfitted' },
      { value: '100%', label: 'calibrated on delivery' },
      { value: '90 days', label: 'phased handover' },
    ],
    deliverables: [
      'Analytical instruments from authorised manufacturers',
      'ESD workbenches for electronics and semiconductor labs',
      'Bench-top and ceiling-mounted fume extraction',
      'Flammable and corrosive storage, EN 14470 certified',
    ],
    challenge:
      'Research instruments had to arrive calibrated and documented for internal QA. Anti-static conditions in electronics labs, and containment requirements in chemistry labs, meant each room needed a different solution.',
    solution:
      'We sourced instruments through authorised distribution channels, carried out calibration before delivery and supplied certificates with every unit. Installation was phased by laboratory, with the ESD and containment rooms handled first.',
    results: [
      'Full calibration documentation for every delivered instrument',
      'All laboratories commissioned within the agreed window',
      'Clear spares and service path through one supplier',
    ],
    image: '/case-studies/khalifa-research-lab.jpg',
    imageAlt: 'Researcher working in a modern university research laboratory',
  },
  {
    slug: 'seha',
    organization: 'SEHA',
    sector: 'Healthcare & Hospitals',
    emirate: 'Abu Dhabi',
    timeframe: '2024 - 2025',
    headline: 'Clinic furniture for ambulatory care centres',
    summary:
      'Standardised examination furniture and diagnostic support equipment supplied across a network of ambulatory care clinics.',
    quote:
      'The same specification in every clinic makes training and maintenance straightforward.',
    author: 'Hessa Al Marzouqi',
    role: 'Facilities Coordinator',
    stats: [
      { value: '20+', label: 'clinics equipped' },
      { value: '1', label: 'standard specification' },
      { value: '4 weeks', label: 'average rollout per site' },
    ],
    deliverables: [
      'Examination tables and treatment trolleys',
      'Phlebotomy chairs and consultation seating',
      'Medical storage and consumables shelving',
      'Diagnostic support equipment and accessories',
    ],
    challenge:
      'Ambulatory care centres opened in batches and each needed identical interiors. Variations between sites meant extra cost, longer timelines and a harder maintenance burden.',
    solution:
      'We agreed a single furniture catalogue for the entire network. One specification covered every clinic, and orders were placed against it as sites came online, with deliveries coordinated through a shared schedule.',
    results: [
      'Consistent interiors across the whole network',
      'Faster clinic fit-outs through a pre-agreed catalogue',
      'Simplified ordering, training and spare parts',
    ],
    image: '/case-studies/seha-clinic.jpg',
    imageAlt: 'Doctor examining a patient in an ambulatory care clinic',
  },
  {
    slug: 'abu-dhabi-police',
    organization: 'Abu Dhabi Police',
    sector: 'Government & Security',
    emirate: 'Abu Dhabi',
    timeframe: '2023 - 2024',
    headline: 'Laboratory fit-out and testing apparatus',
    summary:
      'Design and installation of laboratory furniture and testing apparatus for institutional facilities, delivered under secure-access conditions.',
    quote:
      'Bespoke layouts, strict access controls and a clean handover. Everything we asked for was in the room plan.',
    author: 'Lt. Khalid Al Shamsi',
    role: 'Laboratory Manager',
    stats: [
      { value: '3', label: 'facilities fitted out' },
      { value: '120+', label: 'units installed' },
      { value: '0', label: 'rework on handover' },
    ],
    deliverables: [
      'Testing apparatus and calibration tools',
      'Heavy-duty workbenches with steel frames',
      'Laboratory furniture in corrosion-resistant materials',
      'Tool storage and shadow boards',
    ],
    challenge:
      'Work took place in secure facilities with controlled access. Layouts had to be confirmed in advance, and equipment had to meet the technical specifications of the work carried out in each room.',
    solution:
      'We surveyed each facility, produced a room-by-room layout for approval and supplied to a fixed specification. Our team worked to the site access schedule and completed commissioning with signed documentation.',
    results: [
      'All three facilities handed over without rework',
      'Layouts confirmed and frozen before procurement',
      'Complete commissioning records for audit',
    ],
    image: '/case-studies/adpolice-lab.jpg',
    imageAlt: 'Laboratory bench equipped with scientific testing apparatus',
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}

export function getFeaturedCaseStudy(): CaseStudy | undefined {
  return caseStudies.find((c) => c.featured);
}

export function getRelatedCaseStudies(slug: string, count = 3): CaseStudy[] {
  return caseStudies.filter((c) => c.slug !== slug).slice(0, count);
}
