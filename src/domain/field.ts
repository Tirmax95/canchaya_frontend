export interface Field {
  id: number;
  establishmentId: number;
  numberField: string;
  description: string;
  basePricePerHour: number;
  ownerId?: number;
  imageFields: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldCatalogItem extends Field {
  establishmentName: string;
  establishmentAddress: string;
}
