// Real Malaysian / Malaysia-based companies used ONLY as example employers.
// The game shows a neutral initials badge for each, never a real logo or brand colours.
// Their presence does not imply current vacancies, salaries or practices.
// In-game behaviour is generic; pay factors are fictional balance values.

export type Industry = 'energy' | 'tech' | 'finance' | 'transport' | 'electronics' | 'public' | 'sme' | 'retail';

export interface Company {
  id: string;
  name: string;
  industry: Industry;
  /** Generic game flavour: faster pace = more performance swing and more stress. */
  pace: 'steady' | 'fast' | 'intense';
  /** Fictional multiplier applied to the job's game salary range. */
  payFactor: number;
  /** Short initials for the neutral in-game badge. Never a logo or brand mark. */
  badge: string;
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
  retail: 'Cafés & retail chains',
};

export const companies: Company[] = [
  { id: 'petronas', name: 'PETRONAS', industry: 'energy', pace: 'steady', payFactor: 1.1, badge: 'PET' },
  { id: 'tnb', name: 'Tenaga Nasional Berhad (TNB)', industry: 'energy', pace: 'steady', payFactor: 1.05, badge: 'TNB' },
  { id: 'simedarby', name: 'Sime Darby', industry: 'energy', pace: 'steady', payFactor: 1.0, badge: 'SD' },
  { id: 'tm', name: 'Telekom Malaysia (TM)', industry: 'tech', pace: 'steady', payFactor: 1.02, badge: 'TM' },
  { id: 'axiata', name: 'Axiata Group', industry: 'tech', pace: 'fast', payFactor: 1.05, badge: 'AX' },
  { id: 'carsome', name: 'Carsome', industry: 'tech', pace: 'intense', payFactor: 1.04, badge: 'CAR' },
  { id: 'maybank', name: 'Maybank', industry: 'finance', pace: 'fast', payFactor: 1.05, badge: 'MBB' },
  { id: 'cimb', name: 'CIMB', industry: 'finance', pace: 'fast', payFactor: 1.05, badge: 'CIMB' },
  { id: 'publicbank', name: 'Public Bank', industry: 'finance', pace: 'steady', payFactor: 1.0, badge: 'PBB' },
  { id: 'airasia', name: 'AirAsia', industry: 'transport', pace: 'intense', payFactor: 0.98, badge: 'AA' },
  { id: 'mahb', name: 'Malaysia Airports', industry: 'transport', pace: 'steady', payFactor: 1.0, badge: 'MAHB' },
  { id: 'mas', name: 'Malaysia Airlines', industry: 'transport', pace: 'fast', payFactor: 1.02, badge: 'MAS' },
  { id: 'intel', name: 'Intel', industry: 'electronics', pace: 'fast', payFactor: 1.08, badge: 'INT' },
  { id: 'infineon', name: 'Infineon', industry: 'electronics', pace: 'fast', payFactor: 1.06, badge: 'IFX' },
  { id: 'inari', name: 'Inari Amertron', industry: 'electronics', pace: 'steady', payFactor: 1.0, badge: 'INR' },
  { id: 'sekolah', name: 'SK Taman Harmoni (fictional)', industry: 'public', pace: 'steady', payFactor: 0.95, fictional: true, badge: 'SK' },
  { id: 'klinik', name: 'Klinik Sihat Selalu (fictional)', industry: 'public', pace: 'fast', payFactor: 0.95, fictional: true, badge: 'KSS' },
  { id: 'kopitiam', name: 'Kopitiam Pak Lang (fictional)', industry: 'sme', pace: 'fast', payFactor: 0.9, fictional: true, badge: 'KPL' },
  { id: 'startup', name: 'Lepak Labs Sdn Bhd (fictional)', industry: 'sme', pace: 'intense', payFactor: 0.97, fictional: true, badge: 'LL' },
  { id: 'agency', name: 'Kreatif Gila Agency (fictional)', industry: 'sme', pace: 'intense', payFactor: 0.92, fictional: true, badge: 'KGA' },
  { id: 'zus', name: 'ZUS Coffee', industry: 'retail', pace: 'fast', payFactor: 0.92, badge: 'ZUS' },
  { id: 'kenangan', name: 'Kopi Kenangan', industry: 'retail', pace: 'fast', payFactor: 0.9, badge: 'KK' },
  { id: 'chagee', name: 'Chagee', industry: 'retail', pace: 'fast', payFactor: 0.93, badge: 'CHG' },
];

export const companyById = (id: string | null | undefined) => companies.find((c) => c.id === id);
