import LogoutButton from "../../components/LogoutButton";

export default function AuthLayout({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex-1 px-6 sm:px-10 bg-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white sm:p-12">
          <h1 className="text-4xl font-bold">UniHub Workshop</h1>
          <p className="mt-2 text-sm text-white/90">
            Tuần lễ kỹ năng và nghề nghiệp 2026
          </p>

          <LogoutButton
            className="absolute bottom-4 right-4 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/30 transition"
          >
            Đăng xuất
          </LogoutButton>
        </div>
        {children}
      </div>
    </div>
  )
}
