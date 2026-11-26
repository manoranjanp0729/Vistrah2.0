import {describe,it,expect} from 'vitest';
import {officialContact,emailHref} from './contact';
describe('Public company contact',()=>{
  it('uses only the official public email',()=>{
    expect(officialContact).toEqual({email:'info@vistrah.in'});
    expect(emailHref(officialContact.email)).toBe('mailto:info@vistrah.in');
  });
  it('rejects missing, malformed and injected email destinations',()=>{
    for(const value of [undefined,'','invalid','javascript:alert(1)','info@vistrah.in?bcc=other@example.com','info@vistrah.in\r\nBcc:other@example.com'])expect(emailHref(value)).toBeNull();
  });
});
