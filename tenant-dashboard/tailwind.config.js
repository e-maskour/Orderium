/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
            },
            screens: {
                xs: '480px',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeInUp 0.3s ease-out both',
                'fade-in-left': 'fadeInLeft 0.3s ease-out both',
                'scale-in': 'scaleIn 0.2s ease-out both',
                'spin-slow': 'spin 3s linear infinite',
            },
            keyframes: {
                fadeInUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                fadeInLeft: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
                scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
            },
            boxShadow: {
                'card': '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)',
                'card-md': '0 4px 16px -2px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.05)',
                'card-xl': '0 12px 40px -6px rgba(0,0,0,0.12), 0 4px 16px -4px rgba(0,0,0,0.08)',
                'brand': '0 4px 16px -2px rgba(99,102,241,0.35)',
                'brand-lg': '0 8px 28px -4px rgba(99,102,241,0.4)',
                'glow': '0 0 0 3px rgba(99,102,241,0.15)',
            },
            backgroundImage: {
                'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                'gradient-dark': 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                'gradient-subtle': 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            },
        },
    },
    plugins: [],
}

