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
import { Landmark, Loader2 } from "lucide-react";

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

  // Sign in
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign up
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
        data: {
          username: userParsed.data,
          display_name: userParsed.data,
        },
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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Landmark className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">BankOps Copilot</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal bank assistant · encrypted, ephemeral, audited
          </p>
        </div>

        <div className="surface-card p-6">
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
                <p className="text-[11px] text-muted-foreground text-center">
                  New accounts get the <span className="mono">ops</span> role by default. A manager can adjust this in Admin & Access.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Synthetic / hackathon data only. Do not upload real customer PII.
        </p>
      </div>
    </div>
  );
};

export default Auth;
