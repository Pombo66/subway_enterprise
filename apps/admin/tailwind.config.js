module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f172a",
        card: "#1e293b"
      },
      animation: {
        'in': 'slideInFromRight 300ms ease-out',
        'slide-in-from-right-full': 'slideInFromRight 300ms ease-out'
      },
      keyframes: {
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
};
