import NavRail from "@/components/dashboard/nav-rail";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <NavRail />
            {children}
        </>
    );
}
