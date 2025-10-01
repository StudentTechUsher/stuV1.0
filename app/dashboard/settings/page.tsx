export default function SettingsPage() {
    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <h1 style={{
                    fontFamily: '"Red Hat Display", sans-serif',
                    fontWeight: 800,
                    color: 'black',
                    fontSize: '2rem',
                    margin: 0,
                    marginBottom: '24px'
                }}>Settings</h1>
                <div className="text-sm text-muted-foreground">
                    Manage your application settings
                </div>
            </div>
        </div>
    );
}
