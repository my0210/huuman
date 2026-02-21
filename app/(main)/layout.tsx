export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: re-enable auth guard once Supabase auth flow is tested
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      {children}
    </div>
  );
}
