import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in | Team Starters" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold text-navy">Sign in</h1>
      <p className="mt-2 mb-8 text-gray-700">
        Enter your email and we&apos;ll send you a link. Your dashboard keeps your
        surveys and readouts in one place.
      </p>
      <LoginForm />
    </div>
  );
}
