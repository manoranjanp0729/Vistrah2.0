export function authEndpoint(register:boolean,seller:boolean){
  return seller?(register?'/auth/seller/register':'/auth/seller/login'):(register?'/auth/register':'/auth/login');
}
