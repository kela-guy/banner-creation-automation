import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect("/")

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <svg
                width="14"
                height="12"
                viewBox="0 0 35 29"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M22.2968 0L10.3364 28.8023H4.14496L8.17128 19.2696L0 0H6.39169L11.2485 12.5112L16.0237 0H22.2968Z"
                  fill="currentColor"
                />
                <path
                  d="M34.5733 0L22.613 28.8023H16.4141L28.2928 0H34.5733Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            Banner Automation
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      </div>
    </div>
  )
}
