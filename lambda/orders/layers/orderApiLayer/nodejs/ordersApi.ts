export enum PaymentType {
  CASH = 'CASH',
  DEBIT_CARD = 'DEBIT_CARD',
  CREDIT_CARD = 'CREDIT_CARD',
  PIX = 'PIX',
}

export enum ShippingType {
  ECONOMIC = 'ECONOMIC',
  URGENT = 'URGENT',
}

export enum CarrierType {
  CORREIOS = 'CORREIOS',
  SEDEX = 'SEDEX',
}

export interface OrderProductResponse {
  code: string;
  price: number;
}


export interface OrderRequest {
  email: string;
  productIds: string[];
  payment: PaymentType;
  shipping: {
    type: ShippingType;
    carrier: CarrierType;
  };
}

export interface OrderResponse {
  email: string;
  id: string;
  createdAt: number;
  shipping: {
    type: ShippingType;
    carrier: CarrierType;
  };
  billing: {
    paymentMethod: PaymentType;
    totalPrice: number;
  };
  products: OrderProductResponse[];
}