import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center" data-testid="not-found">
      <h2 className="text-4xl font-bold mb-2">404</h2>
      <p className="text-muted-foreground mb-6">העמוד לא נמצא</p>
      <Link href="/">
        <Button variant="secondary" className="gap-2">
          <ArrowRight className="w-4 h-4" />
          חזרה לדף הראשי
        </Button>
      </Link>
    </div>
  );
}
