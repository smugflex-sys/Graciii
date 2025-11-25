import { useState } from "react";
import { User, Lock, School } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"" | "admin" | "teacher" | "accountant" | "parent">("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    if (email && password) {
      setIsLoading(true);
      login(email, password)
        .then(() => {
          const userData = localStorage.getItem('currentUser');
          const parsed = userData ? JSON.parse(userData) : null;
          const effectiveRole = parsed?.role || role || "";
          navigate(`/${effectiveRole}`);
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && email && password) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2540] via-[#0d3558] to-[#0A2540] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div 
            onClick={() => navigate("/")}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:shadow-2xl transition-all hover:scale-110 shadow-xl p-2.5 ring-4 ring-[#FFD700]/30"
          >
            <School className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl text-white mb-2">Graceland Royal Academy</h1>
          <p className="text-[#FFD700] italic">Wisdom & Illumination</p>
        </div>

        {/* Login Card */}
        <Card className="rounded-2xl shadow-2xl border-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="bg-white pb-6 pt-8">
            <h2 className="text-center text-[#0A2540]">Portal Login</h2>
            <p className="text-center text-gray-600 text-sm">Enter your email and password</p>
          </CardHeader>
          
          <CardContent className="bg-white p-8 space-y-6" onKeyPress={handleKeyPress}>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#0A2540]">Email Address</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-11 rounded-xl border-2 border-gray-200 focus:border-[#FFD700] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#0A2540]">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-11 rounded-xl border-2 border-gray-200 focus:border-[#FFD700] transition-colors"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-[#0A2540]">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as any)}>
                <SelectTrigger id="role" className="h-12 rounded-xl border-2 border-gray-200">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={!email || !password || isLoading}
              className="w-full h-12 bg-[#FFD700] text-[#0A2540] hover:bg-[#FFD700]/90 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              {isLoading ? "Logging in..." : "Login to Portal"}
            </Button>

            {/* Back to Home */}
            <div className="text-center pt-4">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-[#0A2540] hover:text-[#FFD700] transition-colors hover:underline"
              >
                ← Back to Home
              </button>
            </div>
        </CardContent>
      </Card>

        {/* Footer Note */}
        <p className="text-center text-white/60 text-sm mt-6">
          Secure login portal for authorized users only
        </p>
      </div>
    </div>
  );
}
