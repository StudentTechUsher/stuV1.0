import { Typography, Box } from "@mui/material";

export default function SettingsPage() {
    return (
        <Box sx={{ p: 2 }}>
            <Typography
                variant="h4"
                sx={{
                    fontFamily: '"Red Hat Display", sans-serif',
                    fontWeight: 800,
                    color: 'black',
                    mb: 3,
                    fontSize: '2rem'
                }}
            >
                Settings
            </Typography>
            <Typography variant="body1" className="font-body" color="text.secondary">
                Manage your application settings here.
            </Typography>
        </Box>
    );
}
