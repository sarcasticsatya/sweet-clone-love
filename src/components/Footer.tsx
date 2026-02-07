import { Link } from "react-router-dom";
import { FileText, Shield, RefreshCw } from "lucide-react";
import { BrandName } from "@/components/BrandName";

interface FooterProps {
  minimal?: boolean;
}

export const Footer = ({ minimal = false }: FooterProps) => {
  if (minimal) {
    return (
      <footer className="py-4 text-center border-t border-border bg-background/50 backdrop-blur-sm">
        <p className="text-xs text-muted-foreground">© 2025 <BrandName size="xs" className="font-medium" />.</p>
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
          <p className="text-sm text-muted-foreground">© 2025 <BrandName size="sm" className="font-medium" />.</p>
          <div className="flex items-center gap-3 md:gap-6 text-xs md:text-sm">
            <Link 
              to="/terms-and-conditions" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="w-4 h-4 hidden md:block" />
              <span className="md:hidden">Terms</span>
              <span className="hidden md:inline">Terms & Conditions</span>
            </Link>
            <Link 
              to="/privacy-policy" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Shield className="w-4 h-4 hidden md:block" />
              <span className="md:hidden">Privacy</span>
              <span className="hidden md:inline">Privacy Policy</span>
            </Link>
            <Link 
              to="/refund-policy" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4 hidden md:block" />
              <span className="md:hidden">Refund</span>
              <span className="hidden md:inline">Refund Policy</span>
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
