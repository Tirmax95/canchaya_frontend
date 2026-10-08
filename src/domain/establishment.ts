export interface Establishment {
  establishmentId: number;
  name: string;
  address: string;
  phone: string;
  imageEstablishment: string;
  organizationId?: number | null;
  organizationName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EstablishmentCatalogItem extends Establishment {
  fieldCount: number;
  minPricePerHour: number | null;
}
