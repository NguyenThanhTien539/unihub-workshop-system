export default function AuthLayout({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex-1 px-6 pb-16 pt-80 sm:px-10 bg-gradient-to-br from-[#5D69EE] via-[#9B5DE5] to-[#E052A0]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        {children}

      </div>
    </div>
  )
}