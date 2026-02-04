import { Link } from "react-router-dom";
import { FileText, Shield, RefreshCw } from "lucide-react";

interface FooterProps {
  minimal?: boolean;
}

export const Footer = ({ minimal = false }: FooterProps) => {
  if (minimal) {
    return (
      <footer className="py-4 text-center border-t border-border bg-background/50 backdrop-blur-sm">
        <p className="text-xs text-muted-foreground">© 2025 NythicAI.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Developed by <span className="font-medium text-muted-foreground">AIWOS</span>
        </p>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2025 NythicAI.</p>
          <div className="flex items-center gap-6 text-sm">
            <Link 
              to="/terms-and-conditions" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="w-4 h-4" />
              Terms & Conditions
            </Link>
            <Link 
              to="/privacy-policy" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
            <Link 
              to="/refund-policy" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
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
  );
};

export default Footer;
