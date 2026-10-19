import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./lib/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { nexa: { purple:'#7C3AED', blue:'#3B82F6', pink:'#EC4899', ink:'#181526', muted:'#777487', canvas:'#FBFAFF' } }, boxShadow: { soft:'0 18px 50px rgba(44,25,84,.09)' } } }, plugins: [] };
export default config;
