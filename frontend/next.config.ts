import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  distDir: process.env.TEST_NEXT_DIST_DIR || '.next',
  output: 'standalone',
  turbopack: {root:path.resolve(process.cwd(), '..')},
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Cross-Origin-Opener-Policy',value:'same-origin-allow-popups'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(self)'},
      {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style https://fonts.googleapis.com; img-src 'self' data: https://api.maptiler.com https://*.googleapis.com https://*.gstatic.com https://maps.google.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.maptiler.com https://accounts.google.com/gsi/ https://*.googleapis.com https://*.gstatic.com; frame-src https://accounts.google.com/gsi/; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}
    ]},{source:'/reset-password',headers:[
      {key:'Referrer-Policy',value:'no-referrer'},
      {key:'Cache-Control',value:'no-store'}
    ]},{source:'/api/provider-applications/:application/documents/:document',headers:[
      {key:'Content-Security-Policy',value:"default-src 'none'; sandbox; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}
    ]}];
  }
};
export default config;


