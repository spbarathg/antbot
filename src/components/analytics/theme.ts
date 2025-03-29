// Common theme constants
export const COLORS = {
  background: '#121212',
  cardBackground: '#1E1E1E',
  border: '#333333',
  text: {
    primary: '#00FF00',
    secondary: '#888888',
  },
  status: {
    profit: '#00FF00',
    loss: '#FF4444',
    warning: '#FFA500',
  },
};

export const TYPOGRAPHY = {
  fontFamily: 'JetBrains Mono, monospace',
  sizes: {
    small: '12px',
    body: '14px',
    header: '18px',
    title: '20px',
  },
};

export const SPACING = {
  card: 2, // theme.spacing(2)
  section: 3, // theme.spacing(3)
};

// Common component styles
export const commonStyles = {
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: '4px',
    border: `1px solid ${COLORS.border}`,
  },
  scrollbar: {
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: COLORS.cardBackground,
    },
    '&::-webkit-scrollbar-thumb': {
      background: COLORS.border,
      borderRadius: '4px',
      '&:hover': {
        background: '#444444',
      },
    },
  },
}; 