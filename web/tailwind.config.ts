import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Player cards and sidebar (light colors)
    'bg-red-100',
    'text-red-800',
    'text-red-900',
    'border-red-200',
    'border-red-300',
    'border-b-red-200',
    'hover:bg-red-50',
    'bg-teal-100',
    'text-teal-800',
    'text-teal-900',
    'border-teal-200',
    'border-teal-300',
    'border-b-teal-200',
    'hover:bg-teal-50',
    'bg-purple-200',
    'text-purple-900',
    'border-purple-300',
    'border-b-purple-300',
    'hover:bg-purple-50',
    'bg-orange-100',
    'text-orange-800',
    'text-orange-900',
    'border-orange-200',
    'border-orange-300',
    'border-b-orange-200',
    'hover:bg-orange-50',
    // Position navbar (dark colors)
    'bg-red-500',
    'hover:bg-red-600',
    'bg-teal-500',
    'hover:bg-teal-600',
    'bg-purple-500',
    'hover:bg-purple-600',
    'bg-orange-500',
    'hover:bg-orange-600',
    // Animation classes
    'animate-in',
    'slide-in-from-bottom-4',
    'fade-in',
    'transition-all',
    'duration-500',
    'ease-in-out',
    'transform',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
}
export default config