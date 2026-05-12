import MainHeader from "../../components/MainHeader";

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex-1 bg-slate-100 px-6 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <MainHeader />
        {children}
      </div>
    </div>
  );
}
