import { AutoSignoutIntegrated } from "@/app/components/AutoSignoutIntegrated";

export default function ViewDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isUsingJwtAuth = !!(process.env.JWT_PUB_KEY || process.env.NBS_PUB_KEY);
  const sessionDurationSec =
    (Number(process.env.AUTH_SESSION_DURATION_MIN) || 30) * 60;
  const authErrorPath = `${process.env.BASE_PATH}/error/auth`;

  return (
    <>
      {isUsingJwtAuth && (
        <AutoSignoutIntegrated
          sessionDurationSec={sessionDurationSec}
          authErrorPath={authErrorPath}
        />
      )}
      {children}
    </>
  );
}
