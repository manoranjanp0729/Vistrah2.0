import {priceInPaise,type CommerceListing} from './commerce';
export type Fulfilment='PICKUP'|'DELIVERY'|'SERVICE';
export type Cutoff='BEFORE_DISPATCH'|'BEFORE_BUILD'|'BEFORE_SERVICE_START';
export type OrderTerms={stock_quantity:number|null;stock_available:number|null;fulfilment_modes:Fulfilment[];delivery_fee_paise:number|null;cancellation_rule:Cutoff|null};
export type TermsForm={stock:string;pickup:boolean;delivery:boolean;deliveryFee:string;cancellation:Cutoff};
export type CartItem={id:string;listing_id:string;quantity:number;revision:number;available:boolean;reason?:string;listing?:CommerceListing;subtotal_paise?:number};
export type Cart={items:CartItem[];maximum_items:number;customer_id:number};
export type OrderStatus='REQUESTED'|'CONFIRMED'|'BUILDING'|'DISPATCHED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'|'REJECTED';
export type CommerceOrder={id:string;listing_id:string;title:string;business:string;kind:'PRODUCT'|'SERVICE_PACKAGE';service_id:number|null;quantity:number;unit_price_paise:number;delivery_fee_paise:number;quoted_total_paise:number;fulfilment_method:Fulfilment;fulfilment_operator:'SELLER'|'VISTRAH';cancellation_rule:Cutoff;phone:string;delivery_address:string|null;status:OrderStatus;revision:number;mode:'TEST';payment_status:'NOT_STARTED';tax_status:'NOT_CONFIGURED'};
export const testOrderCopy='Unpaid test orders only. No real purchase, payment, dispatch or booking is made. Tax and live payment handling are not configured.';
export function termsForm(row:CommerceListing):TermsForm{const terms=row.order_terms;return {stock:terms?.stock_quantity===null||terms?.stock_quantity===undefined?'':String(terms.stock_quantity),pickup:terms?.fulfilment_modes.includes('PICKUP')??false,delivery:terms?.fulfilment_modes.includes('DELIVERY')??false,deliveryFee:terms?.delivery_fee_paise===null||terms?.delivery_fee_paise===undefined?'':(terms.delivery_fee_paise/100).toFixed(2),cancellation:terms?.cancellation_rule??(row.kind==='PRODUCT'?'BEFORE_DISPATCH':'BEFORE_SERVICE_START')};}
export function boundedQuantity(value:string,max=999){if(!/^\d+$/.test(value.trim()))throw new Error('Enter a whole quantity.');const quantity=Number(value);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>max)throw new Error('Quantity must be between 1 and '+max+'.');return quantity;}
export function termsInput(kind:CommerceListing['kind'],form:TermsForm,revision:number){
 if(kind==='SERVICE_PACKAGE')return {revision,stock_quantity:null,fulfilment_modes:['SERVICE'] as Fulfilment[],delivery_fee_paise:null,cancellation_rule:'BEFORE_SERVICE_START' as Cutoff};
 const stock=form.stock.trim();if(!/^\d+$/.test(stock)||Number(stock)>1000000)throw new Error('Enter a stock batch quantity from 0 to 1,000,000.');
 const modes:Fulfilment[]=[];if(form.pickup)modes.push('PICKUP');if(form.delivery)modes.push('DELIVERY');if(!modes.length)throw new Error('Choose pickup, delivery or both.');
 if(form.cancellation!=='BEFORE_BUILD'&&form.cancellation!=='BEFORE_DISPATCH')throw new Error('Choose a product cancellation cutoff.');
 const fee=form.delivery?(/^0+(?:\.0{1,2})?$/.test(form.deliveryFee.trim())?0:priceInPaise(form.deliveryFee)):null;
 return {revision,stock_quantity:Number(stock),fulfilment_modes:modes,delivery_fee_paise:fee,cancellation_rule:form.cancellation};
}
export function canCancel(row:CommerceOrder){return row.cancellation_rule==='BEFORE_DISPATCH'?['REQUESTED','CONFIRMED','BUILDING'].includes(row.status):['REQUESTED','CONFIRMED'].includes(row.status);}
export function nextStatuses(row:CommerceOrder):OrderStatus[]{
 if(row.status==='REQUESTED')return ['CONFIRMED','REJECTED'];
 if(row.kind==='SERVICE_PACKAGE')return row.status==='CONFIRMED'?['IN_PROGRESS']:row.status==='IN_PROGRESS'?['COMPLETED']:[];
 if(row.status==='DISPATCHED')return ['COMPLETED'];
 if(row.status==='CONFIRMED'||row.status==='BUILDING'){const result:OrderStatus[]=[];if(row.status==='CONFIRMED'&&row.cancellation_rule==='BEFORE_BUILD')result.push('BUILDING');result.push(row.fulfilment_method==='DELIVERY'?'DISPATCHED':'COMPLETED');return result;}
 return [];
}
export const transitionLabel:Record<string,string>={CONFIRMED:'Confirm request',REJECTED:'Reject request',BUILDING:'Start building',DISPATCHED:'Mark test dispatch',IN_PROGRESS:'Start service',COMPLETED:'Mark completed'};
export function requestKey(){return 'order_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);}
export function prepareOrder(item:CartItem,method:Fulfilment,phone:string,address:string,key:string,customerId:number){
 if(!Number.isSafeInteger(customerId)||customerId<1)throw new Error('Reload your cart to verify your account before requesting an order.');
 const row=item.listing;if(!item.id||!item.available||!row||!row.order_terms?.fulfilment_modes.includes(method))throw new Error('Reload your cart and choose an approved fulfilment method.');
 const contact=phone.trim();if(!/^\+?[0-9 ()-]+$/.test(contact)||contact.length>20||contact.replace(/\D/g,'').length<7||contact.replace(/\D/g,'').length>15)throw new Error('Enter a phone number with 7–15 digits.');
 if(method==='DELIVERY'&&(address.trim().length<10||address.trim().length>1000))throw new Error('Enter a delivery address containing 10–1,000 characters.');
 return {listing_id:row.id,listing_revision:row.revision,cart_revision:item.revision,cart_line_id:item.id,expected_customer_id:customerId,fulfilment_method:method,phone:contact,...(method==='DELIVERY'?{delivery_address:address.trim()}:{}),idempotency_key:key};
}
