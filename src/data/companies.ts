// Real Malaysian / Malaysia-based companies used ONLY as example employers.
// Their presence does not imply current vacancies, salaries or practices.
// In-game behaviour is generic; pay factors are fictional balance values.

export type Industry = 'energy' | 'tech' | 'finance' | 'transport' | 'electronics' | 'public' | 'sme';

export interface Company {
  id: string;
  name: string;
  industry: Industry;
  /** Generic game flavour: faster pace = more performance swing and more stress. */
  pace: 'steady' | 'fast' | 'intense';
  /** Fictional multiplier applied to the job's game salary range. */
  payFactor: number;
  fictional?: boolean;
}

export const industryLabels: Record<Industry, string> = {
  energy: 'Energy & engineering',
  tech: 'Technology & telco',
  finance: 'Banking & finance',
  transport: 'Transport & travel',
  electronics: 'Electronics & manufacturing',
  public: 'Schools & clinics (fictional)',
  sme: 'SMEs & startups (fictional)',
};

export const companies: Company[] = [
  { id: 'petronas', name: 'PETRONAS', industry: 'energy', pace: 'steady', payFactor: 1.1 },
  { id: 'tnb', name: 'Tenaga Nasional Berhad (TNB)', industry: 'energy', pace: 'steady', payFactor: 1.05 },
  { id: 'simedarby', name: 'Sime Darby', industry: 'energy', pace: 'steady', payFactor: 1.0 },
  { id: 'tm', name: 'Telekom Malaysia (TM)', industry: 'tech', pace: 'steady', payFactor: 1.02 },
  { id: 'axiata', name: 'Axiata Group', industry: 'tech', pace: 'fast', payFactor: 1.05 },
  { id: 'carsome', name: 'Carsome', industry: 'tech', pace: 'intense', payFactor: 1.04 },
  { id: 'maybank', name: 'Maybank', industry: 'finance', pace: 'fast', payFactor: 1.05 },
  { id: 'cimb', name: 'CIMB', industry: 'finance', pace: 'fast', payFactor: 1.05 },
  { id: 'publicbank', name: 'Public Bank', industry: 'finance', pace: 'steady', payFactor: 1.0 },
  { id: 'airasia', name: 'AirAsia', industry: 'transport', pace: 'intense', payFactor: 0.98 },
  { id: 'mahb', name: 'Malaysia Airports', industry: 'transport', pace: 'steady', payFactor: 1.0 },
  { id: 'mas', name: 'Malaysia Airlines', industry: 'transport', pace: 'fast', payFactor: 1.02 },
  { id: 'intel', name: 'Intel', industry: 'electronics', pace: 'fast', payFactor: 1.08 },
  { id: 'infineon', name: 'Infineon', industry: 'electronics', pace: 'fast', payFactor: 1.06 },
  { id: 'inari', name: 'Inari Amertron', industry: 'electronics', pace: 'steady', payFactor: 1.0 },
  { id: 'sekolah', name: 'SK Taman Harmoni (fictional)', industry: 'public', pace: 'steady', payFactor: 0.95, fictional: true },
  { id: 'klinik', name: 'Klinik Sihat Selalu (fictional)', industry: 'public', pace: 'fast', payFactor: 0.95, fictional: true },
  { id: 'kopitiam', name: 'Kopitiam Pak Lang (fictional)', industry: 'sme', pace: 'fast', payFactor: 0.9, fictional: true },
  { id: 'startup', name: 'Lepak Labs Sdn Bhd (fictional)', industry: 'sme', pace: 'intense', payFactor: 0.97, fictional: true },
  { id: 'agency', name: 'Kreatif Gila Agency (fictional)', industry: 'sme', pace: 'intense', payFactor: 0.92, fictional: true },
];

export const companyById = (id: string | null | undefined) => companies.find((c) => c.id === id);
