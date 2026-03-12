export type HospitalProfileRecord = {
  id: string | null;
  legalName: string;
  displayName: string;
  registrationNumber: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  logoUrl: string | null;
  letterheadFooter: string | null;
  updatedAt: string | null;
};

export type HospitalProfileUpdateInput = {
  legalName: string;
  displayName: string;
  registrationNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string;
  letterheadFooter?: string;
};
