All these styles use your LMS color palette (#005b96, #6497b1, #b3cde0, #011f4b) and Material-UI’s sx prop for easy customization and consistency

Dashboard Background

<Box
  sx={{
    minHeight: '100vh',
    bgcolor: 'background.default', // usually a light or subtle gradient
    background: 'linear-gradient(135deg, #f5fafd 0%, #e3ecf7 100%)', // example
    pt: { xs: 8, md: 10 }, // padding for header
    pl: { md: '280px' }, // sidebar width
    transition: 'background 0.3s'
  }}
>
  {/* ...dashboard content... */}
</Box>
2. Header (AppBar/Custom Box)
<AppBar
  position="fixed"
  sx={{
    width: { md: 'calc(100% - 280px)' },
    ml: { md: '280px' },
    bgcolor: 'primary.main',
    boxShadow: '0 2px 12px rgba(0,91,150,0.08)',
    zIndex: (theme) => theme.zIndex.drawer + 1,
    background: 'linear-gradient(90deg, #005b96 0%, #6497b1 100%)'
  }}
>
  <Toolbar>
    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
      Dashboard Title
    </Typography>
    {/* ...actions... */}
  </Toolbar>
</AppBar>
Sidebar (Drawer)
<Drawer
  variant="permanent"
  sx={{
    width: 280,
    flexShrink: 0,
    [& .MuiDrawer-paper]: {
      width: 280,
      boxSizing: 'border-box',
      bgcolor: '#011f4b',
      color: '#b3cde0',
      borderRight: 'none',
      boxShadow: '2px 0 16px 0 rgba(0,91,150,0.08)'
    }
  }}
>
  <Toolbar />
  <Box sx={{ overflow: 'auto', pt: 2 }}>
    {/* Sidebar menu items */}
    <List>
      <ListItem button>
        <ListItemIcon sx={{ color: '#b3cde0' }}><DashboardIcon /></ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItem>
      {/* ...other items... */}
    </List>
  </Box>
</Drawer>
4. Card Design
<Card
  sx={{
    borderRadius: 3,
    boxShadow: '0 4px 24px 0 rgba(0,91,150,0.10)',
    bgcolor: '#fff',
    p: 3,
    mb: 3,
    transition: 'box-shadow 0.3s',
    '&:hover': {
      boxShadow: '0 8px 32px 0 rgba(0,91,150,0.18)'
    }
  }}
>
  <CardContent>
    <Typography variant="h6" fontWeight={600}>
      Card Title
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Card content goes here.
    </Typography>
  </CardContent>
</Card>
<Button
  sx={{
    bgcolor: '#005b96',
    color: '#fff',
    borderRadius: 2,
    px: 3,
    py: 1,
    fontWeight: 600,
    boxShadow: '0 2px 8px 0 rgba(0,91,150,0.10)',
    '&:hover': {
      bgcolor: '#6497b1',
      color: '#fff',
      boxShadow: '0 4px 16px 0 rgba(0,91,150,0.18)'
    }
  }}
>
  Action
</Button>
Avatar Gradient:
<Avatar
  sx={{
    bgcolor: 'transparent',
    background: 'linear-gradient(135deg, #005b96 0%, #6497b1 100%)',
    color: '#fff',
    width: 48,
    height: 48,
    boxShadow: '0 2px 8px 0 rgba(0,91,150,0.10)'
  }}
>
  <PersonIcon />
</Avatar>
Section Divider:<Divider sx={{ borderColor: '#6497b1', opacity: 0.3, my: 3 }} />

All these styles use your LMS color palette (#005b96, #6497b1, #b3cde0, #011f4b) and Material-UI’s sx prop for easy customization and consistency