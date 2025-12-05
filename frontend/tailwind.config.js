/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SGT University Blue Theme Palette
        sgt: {
          50: '#ADE1FB',   // Lightest - backgrounds, hover states
          100: '#8ED4F8',  // Light accents
          200: '#6FC7F5',  // Light borders
          300: '#4BBAF2',  // Subtle highlights
          400: '#266CA9',  // Secondary actions
          500: '#1A5A8F',  // Primary mid-tone
          600: '#0F2573',  // Primary - buttons, links
          700: '#041D56',  // Dark primary - headers
          800: '#021340',  // Darker - emphasis
          900: '#01082D',  // Darkest - text, backgrounds
        },
        // Keep primary as alias for backward compatibility
        primary: {
          50: '#ADE1FB',
          100: '#8ED4F8',
          200: '#6FC7F5',
          300: '#4BBAF2',
          400: '#266CA9',
          500: '#1A5A8F',
          600: '#0F2573',
          700: '#041D56',
          800: '#021340',
          900: '#01082D',
        },
      },
      backgroundImage: {
        'sgt-gradient': 'linear-gradient(135deg, #0F2573 0%, #041D56 50%, #01082D 100%)',
        'sgt-gradient-light': 'linear-gradient(135deg, #ADE1FB 0%, #266CA9 100%)',
        'sgt-gradient-radial': 'radial-gradient(ellipse at top, #266CA9 0%, #041D56 100%)',
      },
      boxShadow: {
        'sgt': '0 4px 14px 0 rgba(4, 29, 86, 0.15)',
        'sgt-lg': '0 10px 40px -10px rgba(4, 29, 86, 0.25)',
        'sgt-xl': '0 25px 50px -12px rgba(1, 8, 45, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
