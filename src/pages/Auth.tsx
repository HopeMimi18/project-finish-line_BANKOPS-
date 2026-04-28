import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Landmark, Loader2, ShieldCheck, KeyRound, Sparkles, Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const emailSchema = z.string().trim().email({ message: "Enter a valid email" }).max(255);
const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password too long" });
const usernameSchema = z
  .string()
  .trim()
  .min(2, { message: "Username must be at least 2 characters" })
  .max(40, { message: "Username too long" });

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParsed = emailSchema.safeParse(signInEmail);
    const pwParsed = passwordSchema.safeParse(signInPassword);
    if (!emailParsed.success) return toast.error(emailParsed.error.issues[0].message);
    if (!pwParsed.success) return toast.error(pwParsed.error.issues[0].message);

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailParsed.data,
      password: pwParsed.data,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Invalid email or password" : error.message);
      return;
    }
    toast.success("Signed in");
    navigate("/", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailParsed = emailSchema.safeParse(signUpEmail);
    const pwParsed = passwordSchema.safeParse(signUpPassword);
    const userParsed = usernameSchema.safeParse(signUpUsername);
    if (!emailParsed.success) return toast.error(emailParsed.error.issues[0].message);
    if (!pwParsed.success) return toast.error(pwParsed.error.issues[0].message);
    if (!userParsed.success) return toast.error(userParsed.error.issues[0].message);

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: emailParsed.data,
      password: pwParsed.data,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: userParsed.data, display_name: userParsed.data },
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("That email is already registered. Try signing in.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Account created. You're signed in.");
    navigate("/", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden">
      {/* Left — brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between border-r border-border bg-gradient-mesh p-10 lg:flex">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Landmark className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="display text-base font-semibold">BankOps Copilot</span>
              <span className="mono text-[11px] text-muted-foreground">AI governance for banks</span>
            </div>
          </div>
        </div>

        <div className="relative max-w-lg space-y-6">
          <span className="badge-dot border border-primary/30 bg-primary/10 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Insider-risk ready
          </span>
          <h1 className="display text-4xl font-semibold leading-[1.1] xl:text-5xl">
            Govern AI inside the bank.{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Without slowing it down.
            </span>
          </h1>
          <p className="text-base text-muted-foreground">
            Encrypted storage, ephemeral access tokens, automatic PII redaction, and a tamper-evident audit
            trail — so employees can use AI safely on real operational work.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <Feature icon={Lock} title="Encrypted at rest" sub="Per-client segmentation" />
            <Feature icon={KeyRound} title="Ephemeral tokens" sub="Scoped, time-bound" />
            <Feature icon={Sparkles} title="PII pre-scan" sub="SA ID · card · SWIFT" />
            <Feature icon={ShieldCheck} title="Full audit trail" sub="Append-only forensics" />
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[11px] text-muted-foreground">
          <span>POPIA-aligned · synthetic-data demo</span>
          <span className="mono">v1.0</span>
        </div>
      </div>

      {/* Right — form */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link
            to="/landing"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to landing
          </Link>
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Landmark className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="display text-lg font-semibold">BankOps Copilot</h1>
              <p className="text-xs text-muted-foreground">AI governance for banks</p>
            </div>
          </div>

          <div className="surface-card glow-ring p-6">
            <div className="mb-5">
              <h2 className="display text-xl font-semibold">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with your work account to continue.
              </p>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="si-email">Work email</Label>
                    <Input
                      id="si-email"
                      type="email"
                      autoComplete="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="employee@bank.example"
                      disabled={busy}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="si-pw">Password</Label>
                    <Input
                      id="si-pw"
                      type="password"
                      autoComplete="current-password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      disabled={busy}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-username">Username</Label>
                    <Input
                      id="su-username"
                      value={signUpUsername}
                      onChange={(e) => setSignUpUsername(e.target.value)}
                      placeholder="employee1"
                      disabled={busy}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">Work email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      autoComplete="email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="employee@bank.example"
                      disabled={busy}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-pw">Password</Label>
                    <Input
                      id="su-pw"
                      type="password"
                      autoComplete="new-password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      disabled={busy}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    New accounts get the <span className="mono">ops</span> role by default. A manager can
                    adjust this in Admin & Access.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Synthetic / demo data only. Do not upload real customer PII.
          </p>
        </div>
      </div>
    </div>
  );
};

const Feature = ({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
}) => (
  <div className="rounded-lg border border-border/60 bg-card/40 p-3 backdrop-blur-sm">
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-sm font-medium">{title}</div>
    </div>
    <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
  </div>
);

export default Auth;
