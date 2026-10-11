import type { NextConfig } from 'next';
const isDevelopment=process.env.NODE_ENV==='development';
const config: NextConfig = {
  distDir: process.env.TEST_NEXT_DIST_DIR || '.next',
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(self)'},
      {key:'Content-Security-Policy',value:`default-src 'self'; script-src 'self' 'unsafe-inline'${isDevelopment?" 'unsafe-eval'":""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`}
    ]},{source:'/reset-password',headers:[
      {key:'Referrer-Policy',value:'no-referrer'},
      {key:'Cache-Control',value:'no-store'}
    ]},{source:'/api/provider-applications/:application/documents/:document',headers:[
      {key:'Content-Security-Policy',value:"default-src 'none'; sandbox; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}
    ]}];
  }
};
export default config;

