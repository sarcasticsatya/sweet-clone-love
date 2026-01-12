import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MonitorSmartphone } from "lucide-react";

interface SessionExpiredDialogProps {
  open: boolean;
  onSignIn: () => void;
}

export const SessionExpiredDialog = ({ open, onSignIn }: SessionExpiredDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <MonitorSmartphone className="w-8 h-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            You've Been Logged Out
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            Your account was signed in on another device. For security reasons, only one device can be active at a time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 sm:justify-center">
          <AlertDialogAction onClick={onSignIn} className="w-full sm:w-auto">
            Sign In Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
