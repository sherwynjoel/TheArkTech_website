const { default: flattenColorPalette } = require("tailwindcss/lib/util/flattenColorPalette");

/**
 * Aceternity UI's recommended plugin: exposes every Tailwind palette colour as
 * a CSS variable (--slate-900, --blue-500, ...) so their components can use
 * `var(--blue-500)` in gradients and beams.
 *
 * Adapted for this site: colours whose value is itself a var() or hsl(var())
 * expression (the site's own tokens and the shadcn tokens) are skipped, since
 * emitting `--bg: var(--bg)` would make those variables cyclic and invalid.
 */
function addVariablesForColors({ addBase, theme }) {
  const allColors = flattenColorPalette(theme("colors"));
  const vars = Object.fromEntries(
    Object.entries(allColors)
      .filter(([, value]) => typeof value === "string" && !value.includes("var("))
      .map(([key, value]) => [`--${key}`, value]),
  );
  addBase({ ":root": vars });
}

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}"],
  theme: {
  	extend: {
  		colors: {
  			bg: 'var(--bg)',
  			'bg-elev': 'var(--bg-elev)',
  			'bg-elev-2': 'var(--bg-elev-2)',
  			ink: 'var(--ink)',
  			'ink-muted': 'var(--ink-muted)',
  			'ink-faint': 'var(--ink-faint)',
  			brand: 'var(--brand)',
  			'brand-bright': 'var(--brand-bright)',
  			'brand-deep': 'var(--brand-deep)',
  			'accent-cyan': 'var(--accent-cyan)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: 'hsl(var(--destructive))',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			display: [
  				'"Clash Display"',
  				'sans-serif'
  			],
  			sans: [
  				'"Satoshi"',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		maxWidth: {
  			content: '80rem'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), addVariablesForColors],
};
