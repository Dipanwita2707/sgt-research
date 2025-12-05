import { createTheme } from '@mui/material/styles';

export const getTheme = (mode = 'light') =>
  createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    palette: {
      mode,
      primary: {
        main: '#005b96',        // Primary Blue
        dark: '#011f4b',        // Primary Dark
        light: '#6497b1',       // Light Blue
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#03396c',        // Primary Mid
        light: '#b3cde0',       // Very Light Blue
        contrastText: '#ffffff',
      },
      background: mode === 'light'
        ? {
            default: '#f8fafc',
            paper: '#ffffff',
          }
        : {
            default: '#0f172a',
            paper: '#1e293b',
          },
      text: {
        primary: mode === 'light' ? '#011f4b' : '#f8fafc',
        secondary: mode === 'light' ? '#03396c' : '#b3cde0',
      },
    },
    shape: { 
      borderRadius: 8 
    },
    // Compact spacing - reduce overall size by ~10%
    spacing: 7,
    typography: {
      fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
      // Reduce all font sizes by ~10%
      fontSize: 13,
      htmlFontSize: 16,
      h1: {
        fontSize: '2rem',
        fontWeight: 700,
      },
      h2: {
        fontSize: '1.75rem',
        fontWeight: 700,
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
      },
      h5: {
        fontSize: '1.1rem',
        fontWeight: 600,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
      },
      subtitle1: {
        fontSize: '0.95rem',
        fontWeight: 500,
      },
      subtitle2: {
        fontSize: '0.85rem',
        fontWeight: 500,
      },
      body1: {
        fontSize: '0.875rem',
      },
      body2: {
        fontSize: '0.8rem',
      },
      button: {
        fontSize: '0.8rem',
        fontWeight: 600,
        textTransform: 'none',
      },
      caption: {
        fontSize: '0.7rem',
      },
      overline: {
        fontSize: '0.65rem',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            // This makes the entire app render at ~90% of normal size
            fontSize: '14px',
          },
          body: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            padding: '6px 16px',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            minHeight: 32,
            transition: 'all 0.2s ease',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 91, 150, 0.15)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }),
          sizeSmall: {
            padding: '4px 12px',
            fontSize: '0.75rem',
            minHeight: 28,
            borderRadius: 6,
          },
          sizeMedium: {
            padding: '6px 16px',
            fontSize: '0.8rem',
            minHeight: 32,
          },
          sizeLarge: {
            padding: '8px 20px',
            fontSize: '0.85rem',
            minHeight: 36,
          },
          contained: {
            background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)',
            color: '#ffffff',
            '&:hover': {
              background: 'linear-gradient(135deg, #03396c 0%, #011f4b 100%)',
            },
            '&:disabled': {
              background: '#b3cde0',
              color: 'rgba(255, 255, 255, 0.7)',
            },
          },
          outlined: {
            borderWidth: '1.5px',
            borderColor: '#005b96',
            color: '#005b96',
            '&:hover': {
              borderColor: '#03396c',
              backgroundColor: 'rgba(0, 91, 150, 0.04)',
              borderWidth: '1.5px',
            },
          },
        },
      },
      MuiIconButton: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '6px',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(0, 91, 150, 0.08)',
            },
          },
          sizeSmall: {
            padding: '4px',
          },
          sizeMedium: {
            padding: '6px',
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            width: 32,
            height: 32,
            fontSize: '0.85rem',
          },
        },
      },
      MuiChip: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            height: 24,
            fontSize: '0.7rem',
            borderRadius: 6,
          },
          sizeSmall: {
            height: 20,
            fontSize: '0.65rem',
          },
          icon: {
            fontSize: '0.85rem',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(0, 91, 150, 0.08)',
            border: '1px solid rgba(0, 91, 150, 0.08)',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0, 91, 150, 0.12)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '14px',
            '&:last-child': {
              paddingBottom: '14px',
            },
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: '12px 14px',
          },
          title: {
            fontSize: '0.95rem',
            fontWeight: 600,
          },
          subheader: {
            fontSize: '0.75rem',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              fontSize: '0.85rem',
              '& fieldset': {
                borderColor: 'rgba(0, 91, 150, 0.2)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(0, 91, 150, 0.4)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#005b96',
                borderWidth: '1.5px',
              },
            },
            '& .MuiInputLabel-root': {
              fontSize: '0.85rem',
            },
            '& .MuiOutlinedInput-input': {
              padding: '8px 12px',
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: '0.85rem',
          },
          input: {
            padding: '8px 12px',
          },
        },
      },
      MuiFormControl: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            '& .MuiInputLabel-root': {
              fontSize: '0.85rem',
            },
          },
        },
      },
      MuiSelect: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: '0.85rem',
          },
          select: {
            padding: '8px 12px',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.85rem',
            padding: '8px 14px',
            minHeight: 36,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '10px 14px',
            fontSize: '0.8rem',
          },
          head: {
            fontWeight: 600,
            fontSize: '0.8rem',
            backgroundColor: '#f8fafc',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: 'rgba(0, 91, 150, 0.04)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            boxShadow: '0 16px 48px rgba(0, 91, 150, 0.15)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: '1.1rem',
            fontWeight: 600,
            padding: '14px 18px',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '14px 18px',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '10px 18px 14px',
            gap: '8px',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            padding: '8px 14px',
            fontSize: '0.8rem',
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            paddingTop: 6,
            paddingBottom: 6,
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontSize: '0.85rem',
          },
          secondary: {
            fontSize: '0.75rem',
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 36,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.7rem',
            padding: '4px 8px',
            borderRadius: 6,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: '0.8rem',
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiAlert-root': {
              fontSize: '0.8rem',
            },
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontSize: '0.65rem',
            minWidth: 16,
            height: 16,
            padding: '0 4px',
          },
        },
      },
      MuiStepper: {
        styleOverrides: {
          root: {
            padding: '16px 0',
          },
        },
      },
      MuiStepLabel: {
        styleOverrides: {
          label: {
            fontSize: '0.8rem',
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&:before': {
              display: 'none',
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 44,
            padding: '0 14px',
          },
          content: {
            margin: '10px 0',
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: '8px 14px 14px',
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(1, 31, 75, 0.5)',
          },
        },
      },
      MuiGrid: {
        styleOverrides: {
          root: {
            '& > .MuiGrid-item': {
              paddingTop: '12px',
              paddingLeft: '12px',
            },
          },
          container: {
            marginTop: '-12px',
            marginLeft: '-12px',
            width: 'calc(100% + 12px)',
          },
        },
      },
    },
  });


