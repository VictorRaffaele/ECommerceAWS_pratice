export enum ProductEventTye {
  CREATED = 'PRODUCT_CREATED',
  UPDATED = 'PRODUCT_UPDATED',
  DELETED = 'PRODUCT_DELETED',
}

export interface ProductEvent {
  resquestId: string;
  eventType: ProductEventTye;
  productId: string;
  productCode: string;
  productPrice: number;
  email: string;
}