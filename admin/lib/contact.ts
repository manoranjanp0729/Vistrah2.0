// Public company contact only; customer/provider contact records remain separate.
export const officialContact = {email:'info@vistrah.in'} as const;
export function emailHref(email:string|undefined) {
  return email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) ? `mailto:${email}` : null;
}
