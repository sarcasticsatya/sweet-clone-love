import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
interface PolicyLayoutProps {
  title: string;
  children: ReactNode;
}
export const PolicyLayout = ({
  title,
  children
}: PolicyLayoutProps) => {
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center p-1.5">
              <Logo size="md" />
            </div>
            <div>
              <h1 className="text-xl font-bold">NythicAI</h1>
              <p className="text-xs text-primary font-medium">Your 24 X 7 Personal Teacher</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-8">Last Updated: January 2025</p>
          
          <div className="prose prose-sm max-w-none text-foreground">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2025 NythicAI.</p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/terms-and-conditions" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms & Conditions
              </Link>
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/refund-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
          <div className="text-center mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground/70">
              Developed by <span className="font-medium text-muted-foreground">AIWOS</span>
            </p>
          </div>
        </div>
      </footer>
    </div>;
};
export default PolicyLayout;